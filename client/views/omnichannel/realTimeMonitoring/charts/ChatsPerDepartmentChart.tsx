// @ts-nocheck
import React, { useRef, useEffect, ReactElement } from 'react';

import { drawLineChart } from '../../../../../app/livechat/client/lib/chartHandler';
import { useTranslation } from '../../../../contexts/TranslationContext';
import { AsyncStatePhase } from '../../../../hooks/useAsyncState';
import { useEndpointData } from '../../../../hooks/useEndpointData';
import Chart from './Chart';
import { useUpdateChartData } from './useUpdateChartData';

const initialData = {
	departments: {},
};

const init = (canvas, context, t): Promise<unknown> =>
	drawLineChart(canvas, context, [t('Open'), t('Closed')], [], [[], []], {
		legends: true,
		anim: true,
		smallTicks: true,
	});

const ChatsPerDepartmentChart = ({ params, reloadRef, ...props }): ReactElement => {
	const t = useTranslation();

	const canvas = useRef();
	const context = useRef();

	const updateChartData = useUpdateChartData({
		context,
		canvas,
		t,
		init,
	});

	const {
		value: data,
		phase: state,
		reload,
	} = useEndpointData('livechat/analytics/dashboards/charts/chats-per-department', params);

	reloadRef.current.chatsPerDepartmentChart = reload;

	const chartData = data ?? initialData;

	useEffect(() => {
		const initChart = async (): Promise<void> => {
			context.current = await init(canvas.current, context.current, t);
		};
		initChart();
	}, [t]);

	useEffect(() => {
		if (state === AsyncStatePhase.RESOLVED) {
			if (chartData?.success) {
				delete chartData.success;
				Object.entries(chartData).forEach(([name, value]) => {
					updateChartData(name, [value.open, value.closed]);
				});
			}
		}
	}, [chartData, state, t, updateChartData]);

	return <Chart ref={canvas} {...props} />;
};

export default ChatsPerDepartmentChart;