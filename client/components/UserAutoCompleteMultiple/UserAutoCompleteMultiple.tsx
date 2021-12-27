// @ts-nocheck
import { AutoComplete, Box, Option, Chip } from '@rocket.chat/fuselage';
import { useMutableCallback, useDebouncedValue } from '@rocket.chat/fuselage-hooks';
import React, { memo, ReactElement, ReactNode, useMemo, useState } from 'react';

import { useEndpointData } from '../../hooks/useEndpointData';
import UserAvatar from '../avatar/UserAvatar';

const query = (term = ''): { selector: string } => ({ selector: JSON.stringify({ term }) });

const UserAutoCompleteMultiple = (props): ReactElement => {
	const [filter, setFilter] = useState('');
	const debouncedFilter = useDebouncedValue(filter, 1000);
	const { value: data } = useEndpointData(
		'users.autocomplete',
		useMemo(() => query(debouncedFilter), [debouncedFilter]),
	);
	const options = useMemo(
		() => data?.items.map((user) => ({ value: user.username, label: user.name })) || [],
		[data],
	);
	const onClickRemove = useMutableCallback((e) => {
		e.stopPropagation();
		e.preventDefault();
		props.onChange(e.currentTarget.value, 'remove');
	});

	return (
		<AutoComplete
			{...props}
			filter={filter}
			setFilter={setFilter}
			renderSelected={({ value: selected }): ReactNode[] =>
				selected?.map((value) => (
					<Chip key={value} {...props} height='x20' value={value} onClick={onClickRemove} mie='x4'>
						<UserAvatar size='x20' username={value} />
						<Box is='span' margin='none' mis='x4'>
							{value}
						</Box>
					</Chip>
				))
			}
			renderItem={({ value, label, ...props }): ReactElement => (
				<Option key={value} {...props}>
					<Option.Avatar>
						<UserAvatar username={value} size='x20' />
					</Option.Avatar>
					<Option.Content>
						{label} <Option.Description>({value})</Option.Description>
					</Option.Content>
				</Option>
			)}
			options={options}
		/>
	);
};

export default memo(UserAutoCompleteMultiple);