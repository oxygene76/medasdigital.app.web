import { observer } from 'mobx-react-lite';
import React, { FunctionComponent, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import env from '@beam-australia/react-env';
import { decrypt, generateKey, IPFS } from 'rebus.nftid.js';
import { ColorPicker } from 'src/components/nft-id/color-picker';
import { IdForm } from 'src/components/nft-id/id-form';
import { IdPreview } from 'src/components/nft-id/id-preview';
import { COLOR_OPTIONS, IPFS_TIMEOUT } from 'src/constants/nft-id';
import { useActions } from 'src/hooks/use-actions';
import { useAppSelector } from 'src/hooks/use-app-select';
import { RootState } from 'src/reducers/store';
import { useStore } from 'src/stores';
import { NftIdData, Theme } from 'src/types/nft-id';
import variables from 'src/utils/variables';
import {
	failedDialogActions,
	processingDialogActions,
	successDialogActions,
	snackbarActions,
} from 'src/reducers/slices';
import { BigLoader } from 'src/components/common/loader';
import { gas } from 'src/constants/default-gas-values';
import { config } from 'src/config-insync';
import { aminoSignTx } from 'src/utils/helper';
import { MsgMintNftId } from '../../proto/rebus/nftid/v1/tx_pb';
import { NftId } from '../../proto/rebus/nftid/v1/id_pb';
import { Button } from '../common/button';
import { getIpfsHttpsUrl, getIpfsId } from 'src/utils/ipfs';
import { Coin } from '../../proto/cosmos/base/v1beta1/coin_pb';
import { Amount } from 'src/stores/wallet/messages/mint-nft-id';

const ipfs = new IPFS(env('NFT_STORAGE_TOKEN'));

const selector = (state: RootState) => {
	return {
		lang: state.language,
	};
};

const PrivateView: FunctionComponent = observer(() => {
	const { accountStore, chainStore, queriesStore, walletStore } = useStore();
	const account = accountStore.getAccount(chainStore.current.chainId);
	const queries = queriesStore.get(chainStore.current.chainId);
	const address = walletStore.isLoaded ? walletStore.rebusAddress : account.bech32Address;
	const { isEvmos } = account.rebus;

	const idQuery = queries.rebus.queryIdRecord.get(address);

	const { lang } = useAppSelector(selector);
	const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
	const [isFetchingPrivateImage, setIsFetchingPrivateImage] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [data, setData] = useState<NftIdData>({
		idNumber: '0x000000000000',
		documentNumber: '0',
	});
	const [currentIdImageData, setCurrentIdImageData] = useState('');

	const [publicImageData, setPublicImageData] = useState('');
	const [privateImageData, setPrivateImageData] = useState('');

	const [failedDialog, successDialog, pendingDialog, showMessage] = useActions([
		failedDialogActions.showFailedDialog,
		successDialogActions.showSuccessDialog,
		processingDialogActions.showProcessingDialog,
		snackbarActions.showSnackbar,
	]);

	const { idRecord } = idQuery;
	const { document_number, encryption_key, id_number, metadata_url } = idRecord || {};

	const goToPublicPreviewLink = useCallback(() => {
		window.open(`${window.location.origin}/nft-id/${config.NFT_ID_ORG_NAME}/v1/${address}`, '_blank');
	}, [address]);

	const onChange = useCallback((name, value) => {
		setData(oldData => ({ ...oldData, [name]: value }));
	}, []);
	const onChangeColor = useCallback((color: Theme) => {
		setData(oldData => ({ ...oldData, theme: color }));
	}, []);
	const onVisibilityChange = useCallback((name, value) => {
		if (name === 'cityOfBirth') {
			name = 'placeOfBirth';
		}

		setData(oldData => ({ ...oldData, [`${name}Hidden`]: value }));
	}, []);

	const onSubmit = useCallback(async () => {
		if (!address) {
			showMessage(variables[lang]['connect_account']);
			return;
		}

		if (!publicImageData || !privateImageData) {
			showMessage('Error generating NFT images, please add data');
			return;
		}

		setIsSaving(true);

		let encryptionKey = '';
		let encryptedEncryptionKey = encryption_key;

		if (encryptedEncryptionKey) {
			encryptionKey = await walletStore.decrypt(encryptedEncryptionKey);
		} else {
			encryptionKey = generateKey();
			encryptedEncryptionKey = await walletStore.encrypt(encryptionKey);
		}

		const { url } = await ipfs.createNft({
			type: NftId.V1,
			organization: config.NFT_ID_ORG_NAME,
			address,
			encryptionKey,
			imageExtension: 'png',
			imageType: 'image/png',
			publicImageData,
			privateImageData,
			extraProperties: { theme: data.theme },
		});

		const mintNftIdMessage = new MsgMintNftId();
		mintNftIdMessage.setAddress(address);
		mintNftIdMessage.setNftType(NftId.V1);
		mintNftIdMessage.setOrganization(config.NFT_ID_ORG_NAME);
		mintNftIdMessage.setEncryptionKey(encryptedEncryptionKey);
		mintNftIdMessage.setMetadataUrl(url);
		const mintingFee = new Coin();
		mintingFee.setAmount(env('NFT_ID_MINTING_FEE'));
		mintingFee.setDenom(config.COIN_MINIMAL_DENOM);
		mintNftIdMessage.setMintingFee(mintingFee);
		const objMessage = mintNftIdMessage.toObject();

		const msg = {
			address: objMessage.address,
			nft_type: objMessage.nftType,
			organization: objMessage.organization,
			encryption_key: objMessage.encryptionKey,
			metadata_url: objMessage.metadataUrl,
			minting_fee: objMessage.mintingFee as Amount,
		};

		const tx = {
			msgs: [
				{
					typeUrl: '/rebus.nftid.v1.MsgMintNftId',
					value: objMessage,
				},
			],
			fee: {
				amount: [
					{
						amount: String(gas.mint_nftid * config.GAS_PRICE_STEP_AVERAGE),
						denom: config.COIN_MINIMAL_DENOM,
					},
				],
				gas: String(gas.mint_nftid),
			},
			memo: '',
		};
		const ethTx = {
			fee: {
				amount: String(gas.mint_nftid * config.GAS_PRICE_STEP_AVERAGE),
				denom: config.COIN_MINIMAL_DENOM,
				gas: String(gas.mint_nftid),
			},
			msg,
			memo: '',
		};

		let txCode = 0;
		let txHash = '';
		let txLog = '';

		try {
			if (walletStore.isLoaded) {
				const result = await walletStore.mintNftId(ethTx, tx as any);
				txCode = result?.tx_response?.code || 0;
				txHash = result?.tx_response?.txhash || '';
				txLog = result?.tx_response?.raw_log || '';
			} else {
				const result = await aminoSignTx(tx, address, null, isEvmos);
				txCode = result?.code || 0;
				txHash = result?.transactionHash || '';
				txLog = result?.rawLog || '';
			}

			if (txCode) {
				throw new Error(txLog);
			}
		} catch (err) {
			const message = (err as any)?.message || '';

			if (message.indexOf('not yet found on the chain') > -1) {
				pendingDialog();
				return;
			}

			failedDialog({ message });
			showMessage(message);
		}

		if (txHash && !txCode) {
			// Wait 2 seconds so the query can be able to fetch it, and also delete previous nft at the same time
			try {
				await Promise.all([
					new Promise(resolve => setTimeout(resolve, 2000)),
					ipfs.deleteIpfs(getIpfsId(metadata_url || '')),
				]);
			} catch (err) {
				// Error deleting nft id, ignore it
			}

			successDialog({ hash: txHash, isNft: true });
			showMessage(
				'NFT ID Successfuly created, but it might take a few seconds before you can see it once you refresh the page'
			);

			queries.queryBalances.getQueryBech32Address(address).fetch();
			queries.rebus.queryIdRecord.get(address).fetch();
		} else {
			try {
				// Delete uploaded ipfs if there was an error creating the id
				ipfs.deleteIpfs(getIpfsId(url || ''));
			} catch (err) {
				// Error deleting nft id, ignore it
			}
		}

		setIsSaving(false);
	}, [
		address,
		publicImageData,
		privateImageData,
		encryption_key,
		data.theme,
		showMessage,
		lang,
		walletStore,
		isEvmos,
		failedDialog,
		pendingDialog,
		successDialog,
		queries.queryBalances,
		queries.rebus.queryIdRecord,
		metadata_url,
	]);

	// Make html element not be scrollable otherwise there's 2 scroll bars in mobile view
	useEffect(() => {
		if (document?.body?.parentElement) {
			document.body.parentElement.style.overflow = 'hidden';
		}

		return () => {
			if (document?.body?.parentElement) {
				document.body.parentElement.style.overflow = '';
			}
		};
	}, []);

	useEffect(() => {
		if (id_number) {
			const documentNumberLength = document_number?.toString()?.length ?? 0;
			const documentNumberPrefix = 'REBUS'.slice(0, 6 + (6 - documentNumberLength));

			setData(oldData =>
				oldData.idNumber !== id_number || !oldData.documentNumber?.startsWith(document_number || '')
					? {
							...oldData,
							idNumber: id_number || '',
							documentNumber: document_number ? `${documentNumberPrefix}${document_number.padStart(6, '0')}` : '',
					  }
					: oldData
			);

			if (metadata_url) {
				setIsFetchingMetadata(true);

				(async () => {
					try {
						const { data: metadata } = await axios.get(getIpfsHttpsUrl(metadata_url), { timeout: IPFS_TIMEOUT });

						setIsFetchingMetadata(false);
						setIsFetchingPrivateImage(true);
						const { data: privateImageData } = await axios.get(getIpfsHttpsUrl(metadata?.properties?.private_image), {
							timeout: IPFS_TIMEOUT,
						});

						const decryptedEncryptionKey = await walletStore.decrypt(encryption_key || '');
						const decryptedPrivateImage = decrypt(decryptedEncryptionKey, privateImageData);

						setData(oldData => ({
							...oldData,
							theme: metadata?.properties?.theme,
						}));
						setCurrentIdImageData(decryptedPrivateImage);
					} catch (error) {
						console.error(`Unable to fetch NFT ID metadata from ${metadata_url}`, error);
					}

					setIsFetchingMetadata(false);
					setIsFetchingPrivateImage(false);
				})();
			}
		}
	}, [document_number, encryption_key, id_number, metadata_url, walletStore]);

	if (idQuery.isFetching || isFetchingMetadata) {
		return <BigLoader />;
	}

	return (
		<div>
			<div className="flex items-center mb-10 py-5 px-6" style={{ backgroundColor: '#FC8157' }}>
				<em
					style={{
						fontSize: '80px',
						fontStyle: 'normal',
						lineHeight: '18px',
						marginRight: '24px',
						opacity: 0.3,
					}}>
					!
				</em>
				<p className="text-lg" style={{ lineHeight: '28px' }}>
					If you are using the keplr wallet the information on the private image will not be encrypted so please do not
					use personal info while testing until we announce the encryption is working
				</p>
			</div>
			<div className="flex-col-reverse w-full h-full flex md:flex-row">
				<IdForm
					className="w-full md:w-fit md:mr-20"
					buttonText="Save"
					data={data}
					isLoading={isSaving}
					isSubmitDisabled={!privateImageData}
					onChange={onChange}
					onSubmit={onSubmit}
					onVisibilityChange={onVisibilityChange}
					shouldConfirm={!!id_number}
				/>
				<div>
					{id_number && metadata_url && (
						<IdPreview
							className="mb-6"
							data={data}
							idImageDataString={currentIdImageData}
							isFetchingImage={isFetchingPrivateImage}
							title="Current ID (Private View)"
							titleSuffix={
								<div className="ml-3">
									<Button backgroundStyle="blue" onClick={goToPublicPreviewLink} smallBorderRadius>
										See Public View
									</Button>
								</div>
							}
						/>
					)}
					<IdPreview
						className="mb-10 md:mb-0"
						data={data}
						onRenderPrivateImage={setPrivateImageData}
						onRenderPublicImage={setPublicImageData}
						title="New ID (Public Preview)"
					/>
					<ColorPicker
						className="mt-6"
						onChange={onChangeColor}
						options={COLOR_OPTIONS}
						value={data.theme || COLOR_OPTIONS[0]}
					/>
				</div>
			</div>
		</div>
	);
});

export { PrivateView };
