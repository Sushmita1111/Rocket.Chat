// @ts-nocheck
import { Button, ButtonGroup, Icon, Modal, Box } from '@rocket.chat/fuselage';
import { useAutoFocus, useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { escapeHTML } from '@rocket.chat/string-helpers';
import React, { ReactElement, useCallback, useMemo } from 'react';

import { RoomRoles } from '../../../../app/models/client';
import { roomTypes, RoomMemberActions } from '../../../../app/utils/client';
import { usePermission, useAllPermissions } from '../../../contexts/AuthorizationContext';
import { useSetModal } from '../../../contexts/ModalContext';
import { useRoute } from '../../../contexts/RouterContext';
import { useMethod } from '../../../contexts/ServerContext';
import { useToastMessageDispatch } from '../../../contexts/ToastMessagesContext';
import { useTranslation } from '../../../contexts/TranslationContext';
import {
	useUserId,
	useUserSubscription,
	useUserSubscriptionByName,
} from '../../../contexts/UserContext';
import { useEndpointActionExperimental } from '../../../hooks/useEndpointActionExperimental';
import { useReactiveValue } from '../../../hooks/useReactiveValue';
import RemoveUsersModal from '../../teams/contextualBar/members/RemoveUsersModal';
import { useUserRoom } from './useUserRoom';
import { useWebRTC } from './useWebRTC';

const useUserHasRoomRole = (uid, rid, role): boolean =>
	useReactiveValue(
		useCallback(() => !!RoomRoles.findOne({ rid, 'u._id': uid, 'roles': role }), [uid, rid, role]),
	);

const getShouldOpenDirectMessage = (
	currentSubscription,
	usernameSubscription,
	canOpenDirectMessage,
	username,
): ReactElement => {
	const canOpenDm = canOpenDirectMessage || usernameSubscription;
	const directMessageIsNotAlreadyOpen =
		currentSubscription && currentSubscription.name !== username;
	return canOpenDm && directMessageIsNotAlreadyOpen;
};

const getUserIsMuted = (room, user, userCanPostReadonly): boolean => {
	if (room?.ro) {
		if (Array.isArray(room.unmuted) && room.unmuted.indexOf(user?.username) !== -1) {
			return false;
		}

		if (userCanPostReadonly) {
			return Array.isArray(room.muted) && room.muted.indexOf(user?.username) !== -1;
		}

		return true;
	}

	return room && Array.isArray(room.muted) && room.muted.indexOf(user?.username) > -1;
};

const WarningModal = ({ text, confirmText, close, confirm, ...props }): ReactElement => {
	const refAutoFocus = useAutoFocus(true);
	const t = useTranslation();
	return (
		<Modal {...props}>
			<Modal.Header>
				<Icon color='warning' name='modal-warning' size={20} />
				<Modal.Title>{t('Are_you_sure')}</Modal.Title>
				<Modal.Close onClick={close} />
			</Modal.Header>
			<Modal.Content fontScale='p3'>{text}</Modal.Content>
			<Modal.Footer>
				<ButtonGroup align='end'>
					<Button ghost onClick={close}>
						{t('Cancel')}
					</Button>
					<Button ref={refAutoFocus} primary danger onClick={confirm}>
						{confirmText}
					</Button>
				</ButtonGroup>
			</Modal.Footer>
		</Modal>
	);
};

export const useUserInfoActions = (user = {}, rid, reload): unknown => {
	const t = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();
	const directRoute = useRoute('direct');

	const setModal = useSetModal();

	const { _id: uid } = user;
	const ownUserId = useUserId();

	const closeModal = useMutableCallback(() => setModal(null));

	const room = useUserRoom(rid);
	const currentSubscription = useUserSubscription(rid);
	const usernameSubscription = useUserSubscriptionByName(user.username);

	const isLeader = useUserHasRoomRole(uid, rid, 'leader');
	const isModerator = useUserHasRoomRole(uid, rid, 'moderator');
	const isOwner = useUserHasRoomRole(uid, rid, 'owner');

	const otherUserCanPostReadonly = useAllPermissions('post-readonly', rid);

	const isIgnored = currentSubscription?.ignored && currentSubscription.ignored.indexOf(uid) > -1;
	const isMuted = getUserIsMuted(room, user, otherUserCanPostReadonly);

	const endpointPrefix = room.t === 'p' ? 'groups' : 'channels';

	const roomConfig = room?.t && roomTypes.getConfig(room.t);

	const [
		roomCanSetOwner,
		roomCanSetLeader,
		roomCanSetModerator,
		roomCanIgnore,
		roomCanBlock,
		roomCanMute,
		roomCanRemove,
	] = [
		...(roomConfig && [
			roomConfig.allowMemberAction(room, RoomMemberActions.SET_AS_OWNER),
			roomConfig.allowMemberAction(room, RoomMemberActions.SET_AS_LEADER),
			roomConfig.allowMemberAction(room, RoomMemberActions.SET_AS_MODERATOR),
			roomConfig.allowMemberAction(room, RoomMemberActions.IGNORE),
			roomConfig.allowMemberAction(room, RoomMemberActions.BLOCK),
			roomConfig.allowMemberAction(room, RoomMemberActions.MUTE),
			roomConfig.allowMemberAction(room, RoomMemberActions.REMOVE_USER),
		]),
	];

	const roomName = room?.t && escapeHTML(roomTypes.getRoomName(room.t, room));

	const userCanSetOwner = usePermission('set-owner', rid);
	const userCanSetLeader = usePermission('set-leader', rid);
	const userCanSetModerator = usePermission('set-moderator', rid);
	const userCanMute = usePermission('mute-user', rid);
	const userCanRemove = usePermission('remove-user', rid);
	const userCanDirectMessage = usePermission('create-d');
	const { shouldAllowCalls, callInProgress, joinCall, startCall } = useWebRTC(rid);

	const shouldOpenDirectMessage = getShouldOpenDirectMessage(
		currentSubscription,
		usernameSubscription,
		userCanDirectMessage,
		user.username,
	);

	const openDirectDm = useMutableCallback(() =>
		directRoute.push({
			rid: user.username,
		}),
	);

	const openDirectMessageOption = useMemo(
		() =>
			shouldOpenDirectMessage && {
				label: t('Direct_Message'),
				icon: 'balloon',
				action: openDirectDm,
			},
		[openDirectDm, shouldOpenDirectMessage, t],
	);

	const videoCallOption = useMemo(() => {
		const handleJoinCall = (): void => {
			joinCall({ audio: true, video: true });
		};
		const handleStartCall = (): void => {
			startCall({ audio: true, video: true });
		};
		const action = callInProgress ? handleJoinCall : handleStartCall;

		return (
			shouldAllowCalls && {
				label: t(callInProgress ? 'Join_video_call' : 'Start_video_call'),
				icon: 'video',
				action,
			}
		);
	}, [callInProgress, shouldAllowCalls, t, joinCall, startCall]);

	const audioCallOption = useMemo(() => {
		const handleJoinCall = (): void => {
			joinCall({ audio: true, video: false });
		};
		const handleStartCall = (): void => {
			startCall({ audio: true, video: false });
		};
		const action = callInProgress ? handleJoinCall : handleStartCall;

		return (
			shouldAllowCalls && {
				label: t(callInProgress ? 'Join_audio_call' : 'Start_audio_call'),
				icon: 'mic',
				action,
			}
		);
	}, [callInProgress, shouldAllowCalls, t, joinCall, startCall]);

	const changeOwnerEndpoint = isOwner ? 'removeOwner' : 'addOwner';
	const changeOwnerMessage = isOwner
		? 'User__username__removed_from__room_name__owners'
		: 'User__username__is_now_a_owner_of__room_name_';
	const changeOwner = useEndpointActionExperimental(
		'POST',
		`${endpointPrefix}.${changeOwnerEndpoint}`,
		// eslint-disable-next-line @typescript-eslint/camelcase
		t(changeOwnerMessage, { username: user.username, room_name: roomName }),
	);
	const changeOwnerAction = useMutableCallback(async () =>
		changeOwner({ roomId: rid, userId: uid }),
	);
	const changeOwnerOption = useMemo(
		() =>
			roomCanSetOwner &&
			userCanSetOwner && {
				label: t(isOwner ? 'Remove_as_owner' : 'Set_as_owner'),
				icon: 'shield-check',
				action: changeOwnerAction,
			},
		[changeOwnerAction, isOwner, t, roomCanSetOwner, userCanSetOwner],
	);

	const changeLeaderEndpoint = isLeader ? 'removeLeader' : 'addLeader';
	const changeLeaderMessage = isLeader
		? 'User__username__removed_from__room_name__leaders'
		: 'User__username__is_now_a_leader_of__room_name_';
	const changeLeader = useEndpointActionExperimental(
		'POST',
		`${endpointPrefix}.${changeLeaderEndpoint}`,
		// eslint-disable-next-line @typescript-eslint/camelcase
		t(changeLeaderMessage, { username: user.username, room_name: roomName }),
	);
	const changeLeaderAction = useMutableCallback(() => changeLeader({ roomId: rid, userId: uid }));
	const changeLeaderOption = useMemo(
		() =>
			roomCanSetLeader &&
			userCanSetLeader && {
				label: t(isLeader ? 'Remove_as_leader' : 'Set_as_leader'),
				icon: 'shield-alt',
				action: changeLeaderAction,
			},
		[isLeader, roomCanSetLeader, t, userCanSetLeader, changeLeaderAction],
	);

	const changeModeratorEndpoint = isModerator ? 'removeModerator' : 'addModerator';
	const changeModeratorMessage = isModerator
		? 'User__username__removed_from__room_name__moderators'
		: 'User__username__is_now_a_moderator_of__room_name_';
	const changeModerator = useEndpointActionExperimental(
		'POST',
		`${endpointPrefix}.${changeModeratorEndpoint}`,
		// eslint-disable-next-line @typescript-eslint/camelcase
		t(changeModeratorMessage, { username: user.username, room_name: roomName }),
	);
	const changeModeratorAction = useMutableCallback(() =>
		changeModerator({ roomId: rid, userId: uid }),
	);
	const changeModeratorOption = useMemo(
		() =>
			roomCanSetModerator &&
			userCanSetModerator && {
				label: t(isModerator ? 'Remove_as_moderator' : 'Set_as_moderator'),
				icon: 'shield',
				action: changeModeratorAction,
			},
		[changeModeratorAction, isModerator, roomCanSetModerator, t, userCanSetModerator],
	);

	const ignoreUser = useMethod('ignoreUser');
	const ignoreUserAction = useMutableCallback(async () => {
		try {
			await ignoreUser({ rid, userId: uid, ignore: !isIgnored });
			if (isIgnored) {
				dispatchToastMessage({ type: 'success', message: t('User_has_been_unignored') });
			} else {
				dispatchToastMessage({ type: 'success', message: t('User_has_been_ignored') });
			}
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	});
	const ignoreUserOption = useMemo(
		() =>
			roomCanIgnore &&
			uid !== ownUserId && {
				label: t(isIgnored ? 'Unignore' : 'Ignore'),
				icon: 'ban',
				action: ignoreUserAction,
			},
		[ignoreUserAction, isIgnored, ownUserId, roomCanIgnore, t, uid],
	);

	const isUserBlocked = currentSubscription?.blocker;
	const toggleBlock = useMethod(isUserBlocked ? 'unblockUser' : 'blockUser');
	const toggleBlockUserAction = useMutableCallback(async () => {
		try {
			await toggleBlock({ rid, blocked: uid });
			dispatchToastMessage({
				type: 'success',
				message: t(isUserBlocked ? 'User_is_unblocked' : 'User_is_blocked'),
			});
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	});
	const toggleBlockUserOption = useMemo(
		() =>
			roomCanBlock &&
			uid !== ownUserId && {
				label: t(isUserBlocked ? 'Unblock' : 'Block'),
				icon: 'ban',
				action: toggleBlockUserAction,
			},
		[isUserBlocked, ownUserId, roomCanBlock, t, toggleBlockUserAction, uid],
	);

	const muteFn = useMethod(isMuted ? 'unmuteUserInRoom' : 'muteUserInRoom');
	const muteUserOption = useMemo(() => {
		const action = (): unknown => {
			const onConfirm = async (): Promise<void> => {
				try {
					await muteFn({ rid, username: user.username });
					closeModal();
					dispatchToastMessage({
						type: 'success',
						message: t(
							isMuted
								? 'User__username__unmuted_in_room__roomName__'
								: 'User__username__muted_in_room__roomName__',
							{ username: user.username, roomName },
						),
					});
				} catch (error) {
					dispatchToastMessage({ type: 'error', message: error });
				}
			};

			if (isMuted) {
				return onConfirm();
			}

			setModal(
				<WarningModal
					text={t('The_user_wont_be_able_to_type_in_s', roomName)}
					close={closeModal}
					confirmText={t('Yes_mute_user')}
					confirm={onConfirm}
				/>,
			);
		};

		return (
			roomCanMute &&
			userCanMute && {
				label: t(isMuted ? 'Unmute_user' : 'Mute_user'),
				icon: isMuted ? 'mic' : 'mic-off',
				action,
			}
		);
	}, [
		closeModal,
		dispatchToastMessage,
		isMuted,
		muteFn,
		rid,
		roomCanMute,
		roomName,
		setModal,
		t,
		user.username,
		userCanMute,
	]);

	const removeFromTeam = useEndpointActionExperimental(
		'POST',
		'teams.removeMember',
		t('User_has_been_removed_from_team'),
	);

	const removeUserAction = useEndpointActionExperimental(
		'POST',
		`${endpointPrefix}.kick`,
		t('User_has_been_removed_from_s', roomName),
	);
	const removeUserOptionAction = useMutableCallback(() => {
		if (room.teamMain && room.teamId) {
			return setModal(
				<RemoveUsersModal
					teamId={room?.teamId}
					userId={uid}
					onClose={closeModal}
					onCancel={closeModal}
					onConfirm={async (rooms): Promise<void> => {
						const roomKeys = Object.keys(rooms);
						await removeFromTeam({
							teamId: room.teamId,
							userId: uid,
							...(roomKeys.length && { rooms: roomKeys }),
						});
						closeModal();
						reload?.();
					}}
				/>,
			);
		}

		setModal(
			<WarningModal
				text={t('The_user_will_be_removed_from_s', roomName)}
				close={closeModal}
				confirmText={t('Yes_remove_user')}
				confirm={async (): Promise<void> => {
					await removeUserAction({ roomId: rid, userId: uid });
					closeModal();
					reload?.();
				}}
			/>,
		);
	});

	const removeUserOption = useMemo(
		() =>
			roomCanRemove &&
			userCanRemove && {
				label: (
					<Box color='danger'>{room.teamMain ? t('Remove_from_team') : t('Remove_from_room')}</Box>
				),
				icon: 'sign-out',
				action: removeUserOptionAction,
			},
		[room, roomCanRemove, userCanRemove, removeUserOptionAction, t],
	);

	return useMemo(
		() => ({
			...(openDirectMessageOption && { openDirectMessage: openDirectMessageOption }),
			...(videoCallOption && { video: videoCallOption }),
			...(audioCallOption && { audio: audioCallOption }),
			...(changeOwnerOption && { changeOwner: changeOwnerOption }),
			...(changeLeaderOption && { changeLeader: changeLeaderOption }),
			...(changeModeratorOption && { changeModerator: changeModeratorOption }),
			...(ignoreUserOption && { ignoreUser: ignoreUserOption }),
			...(muteUserOption && { muteUser: muteUserOption }),
			...(removeUserOption && { removeUser: removeUserOption }),
			...(toggleBlockUserOption && { toggleBlock: toggleBlockUserOption }),
		}),
		[
			audioCallOption,
			changeLeaderOption,
			changeModeratorOption,
			changeOwnerOption,
			ignoreUserOption,
			muteUserOption,
			openDirectMessageOption,
			removeUserOption,
			videoCallOption,
			toggleBlockUserOption,
		],
	);
};