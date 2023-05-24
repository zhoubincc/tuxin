<template>
	<view class="page_container">
		<custom-nav-bar title="群成员权限" />

		<view class="setting_row">
			<setting-item title="不允许查看群成员资料" :loading="switchLoading.look" @switch="changeLook"
				:switchValue="!canLookOther" :is_switch="true" />
			<setting-item title="不允许添加群成员为好友" :loading="switchLoading.add" @switch="changeAdd"
				:switchValue="!canAddOther" :is_switch="true" />
		</view>
	</view>
</template>

<script>
	import IMSDK from '@/util/compatibleIM'
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	import SettingItem from '@/components/SettingItem/index.vue'
	import {
		GroupAllowTypes
	} from '@/constant';
	export default {
		components: {
			CustomNavBar,
			SettingItem
		},
		data() {
			return {
				switchLoading: {
					look: false,
					add: false
				}

			};
		},
		computed: {
			canLookOther() {
				return this.$store.getters.storeCurrentGroup.lookMemberInfo === GroupAllowTypes.Allowed
			},
			canAddOther() {
				return this.$store.getters.storeCurrentGroup.applyMemberFriend === GroupAllowTypes.Allowed
			}
		},
		methods: {
			changeLook(flag) {
				this.switchLoading.look = true
				IMSDK.compatibleAPI(IMSDK.IMMethods.SetGroupLookMemberInfo, IMSDK.uuidv4(), this.$store.getters
						.storeCurrentGroup.groupID, flag ? GroupAllowTypes.NotAllowed : GroupAllowTypes.Allowed)
					.catch(() => uni.$u.toast('设置失败')).finally(() => this.switchLoading.look = false)
			},
			changeAdd(flag) {
				this.switchLoading.add = true
				IMSDK.compatibleAPI(IMSDK.IMMethods.SetGroupApplyMemberFriend, IMSDK.uuidv4(), this.$store.getters
						.storeCurrentGroup.groupID, flag ? GroupAllowTypes.NotAllowed : GroupAllowTypes.Allowed)
					.catch(() => uni.$u.toast('设置失败')).finally(() => this.switchLoading.add = false)
			}
		}
	}
</script>

<style lang="scss">
	.page_container {
		background-color: #f8f8f8;

		.setting_row {
			background-color: #fff;
			margin: 24rpx 0;
		}
	}
</style>
