<template>
	<view class="single_settings_container">
		<custom-nav-bar title="聊天设置" />
		
		<view class="row_wrap">
			<view class="setting_row info_row">
				<view @click="toUserCard" class="user_info">
					<my-avatar :src="storeCurrentConversation.faceURL" :desc="storeCurrentConversation.showName"
						size="48" />
					<text class="user_name">{{storeCurrentConversation.showName}}</text>
				</view>
				<view @click="invite2group" class="action">
					<image style="width: 48px;height: 48px;" src="@/static/images/single_setting_add.png" alt=""/>
				</view>
			</view>
			
			<search-action-row />
			
			<view class="setting_row conversation_state_row">
				<setting-item title="置顶联系人" :loading="switchLoading.pin" @switch="changePin"
					:switchValue="storeCurrentConversation.isPinned" is_switch />
				<setting-item title="消息免打扰" :loading="switchLoading.opt" @switch="changeOpt($event,2)"
					:switchValue="storeCurrentConversation.recvMsgOpt === 2" is_switch />
				<setting-item title="屏蔽消息" :loading="switchLoading.opt" @switch="changeOpt($event,1)"
					:switchValue="storeCurrentConversation.recvMsgOpt === 1" is_switch />
				<setting-item title="阅后即焚" :loading="switchLoading.readLimit" @switch="changeReadLimit"
					:switchValue="storeCurrentConversation.isPrivateChat" is_switch />
				<setting-item title="时间设置" @click="chooseReadLimitTime">
					<text style="color: #999;">{{storeCurrentConversation.burnDuration||30}}s</text>
				</setting-item>
				<!-- <setting-item title="好友消息设置" :border="false" /> -->
			</view>
			
			<view class="setting_row" style="padding: 0;">
				<setting-item @click="toSetBg" title="设置聊天背景" />
				<setting-item @click="toSetFontSize" title="字体大小" :border="false" />
			</view>
			
			<view class="setting_row" style="padding: 0;margin-bottom: 10vh;">
				<setting-item @click="() => showConfirm = true" title="清空聊天记录" :border="false" />
			</view>
			
			<u-modal content="确定要清空聊天记录吗？" asyncClose :show="showConfirm" showCancelButton @confirm="confirmClear"
				@cancel="() => showConfirm = false"></u-modal>
		</view>
	</view>
</template>

<script>
	import {
		mapGetters
	} from 'vuex'
	import {
		GroupType,
		OptType
	} from '@/constant'
	import IMSDK from '@/util/compatibleIM'
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	import MyAvatar from '@/components/MyAvatar/index.vue'
	import SettingItem from '@/components/SettingItem/index.vue'
	import SearchActionRow from './components/SearchActionRow.vue'
	export default {
		components: {
			CustomNavBar,
			MyAvatar,
			SettingItem,
			SearchActionRow
		},
		props: {

		},
		data() {
			return {
				switchLoading: {
					pin: false,
					opt: false,
					readLimit: false,
				},
				showConfirm: false
			};
		},
		computed: {
			...mapGetters(['storeCurrentConversation']),
		},
		methods: {
			toUserCard() {
				uni.navigateTo({
					url: `/pages/common/userCard/index?sourceID=${this.storeCurrentConversation.userID}`
				})
			},
			invite2group() {
				uni.showActionSheet({
					itemList: ['普通群', '工作群'],
					success: ({
						tapIndex
					}) => {
						const checkedMemberList = JSON.stringify([{
							userID: this.storeCurrentConversation.userID,
							faceURL: this.storeCurrentConversation.faceURL,
							nickname: this.storeCurrentConversation.showName,
						}])
						uni.navigateTo({
							url: `/pages/common/createGroup/index?type=${tapIndex ? GroupType.WorkingGroup : GroupType.NomalGroup}&checkedMemberList=${checkedMemberList}`
						})
					}
				})
			},
			changePin(isPin) {
				this.switchLoading.pin = true
				IMSDK.compatibleAPI(IMSDK.IMMethods.PinConversation, IMSDK.uuidv4(), this.storeCurrentConversation
						.conversationID, isPin)
					.then(() => uni.$u.toast('操作成功')).catch(() => uni.$u.toast('操作失败'))
					.finally(() => this.switchLoading.pin = false)
			},
			changeOpt(notNomal, type) {
				this.switchLoading.opt = true
				IMSDK.compatibleAPI(IMSDK.IMMethods.SetConversationRecvMessageOpt, IMSDK.uuidv4(), [this
						.storeCurrentConversation
						.conversationID
					], notNomal ? type : OptType.Nomal)
					.then(() => uni.$u.toast('操作成功')).catch(() => uni.$u.toast('操作失败'))
					.finally(() => this.switchLoading.opt = false)
			},
			changeReadLimit(isLimit) {
				this.switchLoading.readLimit = true
				IMSDK.compatibleAPI(IMSDK.IMMethods.SetOneConversationPrivateChat, IMSDK.uuidv4(), this
						.storeCurrentConversation
						.conversationID, isLimit)
					.then(() => uni.$u.toast('操作成功')).catch(() => uni.$u.toast('操作失败'))
					.finally(() => this.switchLoading.readLimit = false)
			},
			confirmClear() {
				IMSDK.compatibleAPI(IMSDK.IMMethods.ClearC2CHistoryMessageFromLocalAndSvr, IMSDK.uuidv4(), this
						.storeCurrentConversation
						.userID)
					.then(() => {
						uni.$u.toast('操作成功');
						this.$store.commit('message/SET_HISTORY_MESSAGE_LIST', []);
						this.$store.commit('message/SET_PREVIEW_IMAGE_LIST', []);
					}).catch(() => uni.$u.toast('操作失败'))
					.finally(() => this.showConfirm = false)
			},
			chooseReadLimitTime() {
				uni.showActionSheet({
					itemList: ['1天', '1小时', '5分钟', '30s'],
					success: ({
						tapIndex
					}) => {
						let sec = 30;
						if (tapIndex === 0) {
							sec = 86400
						}
						if (tapIndex === 1) {
							sec = 3600
						}
						if (tapIndex === 2) {
							sec = 300
						}
						IMSDK.compatibleAPI(IMSDK.IMMethods.SetOneConversationBurnDuration, IMSDK.uuidv4(),
							this
							.storeCurrentConversation.conversationID, sec).then(res=>{
								console.log(res);
							}).catch(() => uni.$u.toast('操作失败'))
					}
				})
			},
			toSetBg() {
				uni.$u.route('/pages/conversation/setChatBackgroup/index')
			},
			toSetFontSize() {
				uni.$u.route('/pages/conversation/setFontSize/index')
			},
		}
	}
</script>

<style lang="scss" scoped>
	.single_settings_container {
		@include colBox(false);
		height: 100vh;
		background-color: #f6f6f6;
		
		.row_wrap {
			flex: 1;
			overflow-y: auto;
		}

		.setting_row {
			background-color: #fff;
			padding: 0 44rpx;
			margin: 12rpx 0;
		}

		.info_row {
			display: flex;
			padding: 44rpx;

			.user_info {
				@include colBox(false);
				margin-right: 36rpx;

				.user_name {
					margin-top: 20rpx;
					color: #666;
				}
			}
		}

		.conversation_state_row {
			padding: 0;
			color: $uni-text-color;
		}
	}
</style>
