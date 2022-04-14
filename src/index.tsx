import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Bounce, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import 'tippy.js/dist/tippy.css';
import { ToastProvider } from './components/common/toasts';
import { RouteWrapper } from './components/layouts/RouteWrapper';
import { AirdropPage } from './pages/airdrop';
import { AssetsPage } from './pages/assets';
import { BootstrapPage } from './pages/bootstrap';
import { GovernancePage } from './pages/governance';
import { GovernanceDetailsPage } from './pages/governance/[id]/GovernanceDetailsPage';
import { MainPage } from './pages/main';
import { NotFoundPage } from './pages/NotFound';
import { PoolPage } from './pages/pool';
import { PoolsPage } from './pages/pools';
import { StoreProvider } from './stores';
import './styles/globals.scss';
import './styles/index.scss';
import { Terms } from './terms';
import { IBCHistoryNotifier } from './provider';
import { AccountConnectionProvider } from 'src/hooks/account/context';

/* Insync Code */
import reducer from './reducers';
import InsyncWrapper from './components/insync/InsyncWrapper';
import Home from './pages/Home';
import Stake from './pages/Stake';
import Proposals from './pages/Proposals';
import './styles/insync.scss';

const store = createStore(
	reducer,
	composeWithDevTools({
		trace: true,
	})(applyMiddleware(thunk))
);
/* End Insync Code */

dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(utc);

const queryClient = new QueryClient();

const Router: FunctionComponent = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>
				<StoreProvider>
					<ToastProvider>
						<AccountConnectionProvider>
							<IBCHistoryNotifier />
							<Terms />
							<div className="md:h-screen bg-background z-0">
								<BrowserRouter>
									<Switch>
										<Route exact path="/">
											<RouteWrapper>
												<MainPage />
											</RouteWrapper>
										</Route>
										<Route exact path="/pools">
											<RouteWrapper>
												<PoolsPage />
											</RouteWrapper>
										</Route>
										<Route path="/pool/:id">
											<RouteWrapper>
												<PoolPage />
											</RouteWrapper>
										</Route>
										<Route exact path="/assets">
											<RouteWrapper>
												<AssetsPage />
											</RouteWrapper>
										</Route>
										<Route exact path="/governance">
											<RouteWrapper>
												<GovernancePage />
											</RouteWrapper>
										</Route>
										<Route exact path="/governance/:id">
											<RouteWrapper>
												<GovernanceDetailsPage />
											</RouteWrapper>
										</Route>
										<Route exact path="/airdrop">
											<RouteWrapper>
												<AirdropPage />
											</RouteWrapper>
										</Route>
										<Route exact path={'/bootstrap'}>
											<RouteWrapper>
												<BootstrapPage />
											</RouteWrapper>
										</Route>
										<Route exact path={'/dashboard'}>
											<InsyncWrapper>
												<Home />
											</InsyncWrapper>
										</Route>
										<Route exact path={'/staking'}>
											<InsyncWrapper>
												<Stake />
											</InsyncWrapper>
										</Route>
										<Route exact path={'/proposals'}>
											<InsyncWrapper>
												<Proposals />
											</InsyncWrapper>
										</Route>
										<Route>
											<RouteWrapper>
												<NotFoundPage />
											</RouteWrapper>
										</Route>
									</Switch>
								</BrowserRouter>
							</div>
							<ToastContainer transition={Bounce} />
						</AccountConnectionProvider>
					</ToastProvider>
				</StoreProvider>
			</Provider>
		</QueryClientProvider>
	);
};

ReactDOM.render(<Router />, document.getElementById('app'));
