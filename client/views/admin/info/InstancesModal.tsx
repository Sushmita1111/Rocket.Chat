// @ts-nocheck
import { Modal, ButtonGroup, Button, Accordion } from '@rocket.chat/fuselage';
import React, { ReactElement } from 'react';

import { IInstance } from '../../../../definition/IInstance';
import { useTranslation } from '../../../contexts/TranslationContext';
import { useFormatDateAndTime } from '../../../hooks/useFormatDateAndTime';
import DescriptionList from './DescriptionList';

type InstancesModalProps = {
	instances?: IInstance[];
	onClose: () => void;
};

const InstancesModal = ({ instances = [], onClose }: InstancesModalProps): ReactElement => {
	const t = useTranslation();

	const formatDateAndTime = useFormatDateAndTime();

	return (
		<Modal width='x600'>
			<Modal.Header>
				<Modal.Title>{t('Instances')}</Modal.Title>
				<Modal.Close onClick={onClose} />
			</Modal.Header>
			<Modal.Content>
				<Accordion>
					{instances.map(({ address, broadcastAuth, currentStatus, instanceRecord }) => (
						<Accordion.Item title={address} key={address}>
							<DescriptionList>
								<DescriptionList.Entry label={t('Address')}>{address}</DescriptionList.Entry>
								<DescriptionList.Entry label={t('Auth')}>
									{broadcastAuth ? 'true' : 'false'}
								</DescriptionList.Entry>
								<DescriptionList.Entry
									label={
										<>
											{t('Current_Status')} &gt; {t('Connected')}
										</>
									}
								>
									{currentStatus.connected ? 'true' : 'false'}
								</DescriptionList.Entry>
								<DescriptionList.Entry
									label={
										<>
											{t('Current_Status')} &gt; {t('Retry_Count')}
										</>
									}
								>
									{currentStatus.retryCount}
								</DescriptionList.Entry>
								<DescriptionList.Entry
									label={
										<>
											{t('Current_Status')} &gt; {t('Status')}
										</>
									}
								>
									{currentStatus.status}
								</DescriptionList.Entry>
								<DescriptionList.Entry
									label={
										<>
											{t('Instance_Record')} &gt; {t('ID')}
										</>
									}
								>
									{instanceRecord._id}
								</DescriptionList.Entry>
								<DescriptionList.Entry
									label={
										<>
											{t('Instance_Record')} &gt; {t('PID')}
										</>
									}
								>
									{instanceRecord.pid}
								</DescriptionList.Entry>
								<DescriptionList.Entry
									label={
										<>
											{t('Instance_Record')} &gt; {t('Created_at')}
										</>
									}
								>
									{formatDateAndTime(instanceRecord._createdAt)}
								</DescriptionList.Entry>
								<DescriptionList.Entry
									label={
										<>
											{t('Instance_Record')} &gt; {t('Updated_at')}
										</>
									}
								>
									{formatDateAndTime(instanceRecord._updatedAt)}
								</DescriptionList.Entry>
							</DescriptionList>
						</Accordion.Item>
					))}
				</Accordion>
			</Modal.Content>
			<Modal.Footer>
				<ButtonGroup align='end'>
					<Button primary onClick={onClose}>
						{t('Close')}
					</Button>
				</ButtonGroup>
			</Modal.Footer>
		</Modal>
	);
};

export default InstancesModal;