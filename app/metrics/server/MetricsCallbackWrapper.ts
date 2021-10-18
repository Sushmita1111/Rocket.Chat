import type { ICallbackWrapper } from '../../../lib/callbacks/ICallbackWrapper';
import type { Callback } from '../../../lib/callbacks/Callback';
import type { ICallbackRunner } from '../../../lib/callbacks/ICallbackRunner';
import { metrics } from './lib/metrics';
import StatsTracker from './lib/statsTracker';

export class MetricsCallbackWrapper implements ICallbackWrapper {
	private innerWrapper: ICallbackWrapper;

	constructor(innerWrapper: ICallbackWrapper) {
		this.innerWrapper = innerWrapper;
	}

	wrap<I, K>(hook: string, chainedCallback: (item: I, constant?: K) => I, callbackCount: number): (item: I, constant?: K) => I {
		const innerCallback = this.innerWrapper.wrap(hook, chainedCallback, callbackCount);

		return (item: I, constant?: K): I => {
			const rocketchatHooksEnd = metrics.rocketchatHooks.startTimer({
				hook,
				// eslint-disable-next-line @typescript-eslint/camelcase
				callbacks_length: callbackCount,
			});
			const next = innerCallback(item, constant);
			rocketchatHooksEnd();
			return next;
		};
	}

	wrapOne<I, K>(runner: ICallbackRunner, hook: string, callback: Callback<I, K>): (item: I, constant?: K) => I {
		return (item: I, constant?: K): I => {
			const time = Date.now();

			const rocketchatCallbacksEnd = metrics.rocketchatCallbacks.startTimer({ hook, callback: callback.id });

			const newResult = runner.runItem({ hook, callback, result: item, constant });

			StatsTracker.timing('callbacks.time', Date.now() - time, [
				`hook:${ hook }`,
				`callback:${ callback.id }`,
			]);

			rocketchatCallbacksEnd();

			return newResult;
		};
	}
}