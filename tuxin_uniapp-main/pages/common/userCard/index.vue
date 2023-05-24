<template>
	<view class="user_card_container">
		<custom-nav-bar title="" />

		<view class="base_info">
			<my-avatar :desc="sourceUserInfo.remark || sourceUserInfo.nickname" :src="sourceUserInfo.faceURL"
				size='48' />
			<view>
				<view class="user_name">
					<!-- <text>{{sourceUserInfo.remark || sourceUserInfo.nickname}}</text> -->
					<text class="text">{{getShowName}}</text>
					<view class="online_state">
						<view class="dot" :style="{backgroundColor:isOnline ? '#10CC64' : '#999'}">
						</view>
						<view class="online_str">{{onlineStr}}</view>
					</view>
				</view>
				<!-- <text class="company">托云信息技术有限公司</text> -->
			</view>
		</view>

		<view v-if="memberInfo" class="info_row">
			<user-info-row-item lable="群昵称" :content="memberInfo.nickname" />
			<user-info-row-item lable="入群时间" :content="getJoinGroupTime" />
			<user-info-row-item lable="入群方式" :content="getJoinSource" />
			<user-info-row-item v-if="showSetRole" lable="设为管理员" arrow>
				<u-switch :loading="switchLoading" @change="changeMemberRole" :asyncChange="true" size="20"
					:value="isAdmin" />
			</user-info-row-item>
			<user-info-row-item v-if="showSetMuteMember" @click="toMuteMember" arrow lable="设置禁言">
				<view class="mute_right">
					<text>{{getMuteTime}}</text>
					<u-icon name="arrow-right" color="#999" size="20"></u-icon>
				</view>
			</user-info-row-item>

		</view>

		<view class="info_row">
			<user-info-row-item @click="copyID" lable="ID号" :content="sourceUserInfo.userID" />
		</view>

		<!-- <view class="company_row info_row">
			<text class="desc_title">组织信息</text>
			<view class="company_info">
				<user-info-row-item lable="企业/组织" content="托云信息技术有限公司" />
				<user-info-row-item lable="部门" content="技术部-A组" />
				<user-info-row-item lable="职位" content="软件工程师" />
			</view>
		</view> -->

		<view v-if="isFriend" class="info_row">
			<user-info-row-item @click="toMoreInfo" lable="个人资料" arrow />
		</view>

		<!-- <view class="info_row">
			<user-info-row-item lable="查看动态" arrow />
		</view> -->

		<view class="action_row">
			<view v-if="showSendMessage" @click="toDesignatedConversation" class="action_item">
				<img src="static/images/user_card_message.png" alt="">
				<text>发消息</text>
			</view>
			<view class="action_item" @click="callUser">
				<img src="static/images/user_card_call.png" alt="">
				<text>OpenIM电话</text>
			</view>
			<view @click="toAddFriend" v-if="!isFriend && !disableAdd" class="action_item">
				<img src="static/images/user_card_add.png" alt="">
				<text>添加好友</text>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		mapGetters
	} from 'vuex'
	import {
		CommonIsAllow,
		GroupJoinSource,
		GroupMemberRole,
		SessionType
	} from '@/constant'
	import {
		getDesignatedUserOnlineState,
		navigateToDesignatedConversation
	} from '@/util/imCommon'
	import IMSDK from '@/util/compatibleIM'
	import MyAvatar from '@/components/MyAvatar/index.vue'
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	import UserInfoRowItem from './components/UserInfoRowItem.vue'
	import dayjs from 'dayjs'
	import {
		businessSearchUserInfo
	} from '@/api/login'
	import {
		filterEmptyValue
	} from '@/util/common'

	export default {
		components: {
			CustomNavBar,
			MyAvatar,
			UserInfoRowItem
		},
		data() {
			return {
				sourceID: '',
				sourceUserInfo: {},
				memberInfo: null,
				onlineStr: '离线',
				isOnline: false,
				switchLoading: false,
				showSetRole: false,
				showSetMuteMember: false,
				disableAdd: false,
			};
		},
		computed: {
			...mapGetters(['storeFriendList', 'storeCurrentMemberInGroup', 'storeCurrentUserID', 'storeAppConfig']),
			isFriend() {
				return this.storeFriendList.findIndex(friend => friend.userID === this.sourceID) !== -1
			},
			isAdmin() {
				return this.memberInfo?.roleLevel === GroupMemberRole.Admin
			},
			getJoinGroupTime() {
				return this.memberInfo ? dayjs(this.memberInfo.joinTime * 1000).format("YYYY-MM-DD") : ''
			},
			getJoinSource() {
				if (!this.memberInfo) {
					return '';
				}

				switch (this.memberInfo.joinSource) {
					case GroupJoinSource.Invitation:
						return '邀请进群';
					case GroupJoinSource.QrCode:
						return '扫码进群';
					case GroupJoinSource.Search:
						return '搜索进群'
					default:
						return '-'
				}
			},
			getShowName() {
				let suffix = ''
				if (this.sourceUserInfo.remark) {
					suffix = `(${this.sourceUserInfo.remark})`
				}
				return this.sourceUserInfo.nickname + suffix
			},
			getMuteTime() {
				if (!this.memberInfo.muteEndTime || this.memberInfo.muteEndTime * 1000 < Date.now()) {
					return ''
				}
				return dayjs(this.memberInfo.muteEndTime * 1000).format('YYYY/MM/DD HH:mm')
			},
			showSendMessage() {
				const businessAllow = this.storeAppConfig.allowSendMsgNotFriend === CommonIsAllow.Allow
				return businessAllow ? businessAllow : this.isFriend
			}
		},
		onLoad(options) {
			const {
				sourceID,
				sourceInfo,
				memberInfo,
				disableAdd
			} = options;
			this.disableAdd = disableAdd ? JSON.parse(disableAdd) : false
			if (sourceID) {
				this.sourceID = sourceID;
				this.getSourceUserInfo()
			} else {
				const info = JSON.parse(sourceInfo)
				this.sourceID = info.userID;
				this.sourceUserInfo = {
					...info
				}
			}
			if (memberInfo) {
				this.memberInfo = JSON.parse(memberInfo)
				this.checkCurrentMember()
			}
			this.getOnlineState()
			this.setIMListener()
		},
		onUnload() {
			this.disposeIMListener()
		},
		methods: {
			async getSourceUserInfo() {
				let info = null
				if (this.isFriend) {
					info = this.storeFriendList.find(friend => friend.userID === this.sourceID)
				} else {
					try {
						const {
							totalNumber,
							userFullInfoList
						} = await businessSearchUserInfo(this.sourceID)
						if (totalNumber > 0) {
							const {
								data
							} = await IMSDK.compatibleAPI(IMSDK.IMMethods.GetUsersInfo, IMSDK.uuidv4(), [this
								.sourceID
							])
							const imData = data[0]?.friendInfo ?? data[0]?.publicInfo ?? {}
							const businessData = userFullInfoList[0];
							filterEmptyValue(businessData)
							info = {
								...imData,
								...businessData
							}
						}
					} catch (e) {
						info = {}
					}
				}
				this.sourceUserInfo = {
					...info
				}
			},
			async getOnlineState() {
				getDesignatedUserOnlineState(this.sourceID).then((str) => {
					this.isOnline = str !== '离线'
					this.onlineStr = str
				}).catch(() => this.isOnline = false)
			},
			async checkCurrentMember() {
				let role
				if (this.storeCurrentMemberInGroup.groupID === this.memberInfo.groupID) {
					role = this.storeCurrentMemberInGroup.roleLevel
				} else {
					try {
						const {
							data
						} = await IMSDK.compatibleAPI(IMSDK.IMMethods.GetGroupMembersInfo, IMSDK.uuidv4(), this
							.memberInfo.groupID, [this.storeCurrentUserID])
						role = data[0]?.roleLevel
					} catch (e) {}
				}
				this.showSetRole = role === GroupMemberRole.Owner
				this.showSetMuteMember = role === GroupMemberRole.Owner || (role === GroupMemberRole.Admin && this
					.memberInfo.roleLevel === GroupMemberRole.Nomal)
			},
			toAddFriend() {
				uni.$u.route('/pages/common/sendAddRequest/index', {
					isGroup: false,
					sourceID: this.sourceID,
					isScan: false,
					notNeedVerification: false,
				})
			},
			callUser() {
				uni.showActionSheet({
					itemList: ['语音通话', '视频通话'],
					success: ({
						tapIndex
					}) => {
						IMSDK.callingModule.startLiveChat(!!tapIndex, [this.sourceID], "", this.$store.getters
							.storeCurrentUserID)
					},
				})
			},
			toDesignatedConversation() {
				navigateToDesignatedConversation(this.sourceID, SessionType.Single, this.memberInfo !== null)
					.catch(() => uni.$u.toast('获取会话信息失败'))
			},
			toMoreInfo() {
				uni.navigateTo({
					url: `/pages/common/userCardMore/index?sourceInfo=${JSON.stringify(this.sourceUserInfo)}`
				})
			},
			copyID() {
				uni.setClipboardData({
					data: this.sourceID,
					success: () => {
						uni.hideToast();
						this.$nextTick(() => {
							uni.$u.toast('复制成功');
						})
					}
				});
			},
			changeMemberRole(flag) {
				this.switchLoading = true
				const newRole = flag ? GroupMemberRole.Admin : GroupMemberRole.Nomal
				IMSDK.compatibleAPI(IMSDK.IMMethods.SetGroupMemberRoleLevel, IMSDK.uuidv4(), this.memberInfo.groupID,
						this.sourceUserInfo.userID, newRole)
					.catch(() => uni.$u.toast('设置失败')).finally(() => this.switchLoading = false)
			},
			toMuteMember() {
				uni.navigateTo({
					url: `/pages/common/setMemberMute/index?sourceInfo=${JSON.stringify(this.memberInfo)}`
				})
			},
			friendInfoChangeHandler({
				friendInfo
			}) {
				const updatedInfo = JSON.parse(friendInfo);
				if (updatedInfo.userID === this.sourceUserInfo.userID) {
					this.sourceUserInfo = {
						...this.sourceUserInfo,
						...updatedInfo
					}
				}
			},
			groupMemberInfoChangeHandler({
				groupMemberInfo
			}) {
				const updatedInfo = JSON.parse(groupMemberInfo);
				if (updatedInfo.userID === this.memberInfo.userID && updatedInfo.groupID === this.memberInfo
					.groupID) {
					this.memberInfo = {
						...this.memberInfo,
						...updatedInfo
					}
				}
			},
			setIMListener() {
				IMSDK.subscribe(IMSDK.IMEvents.OnFriendInfoChanged, this.friendInfoChangeHandler)
				IMSDK.subscribe(IMSDK.IMEvents.OnGroupMemberInfoChanged, this.groupMemberInfoChangeHandler)
			},
			disposeIMListener() {
				IMSDK.unsubscribe(IMSDK.IMEvents.OnFriendInfoChanged, this.friendInfoChangeHandler)
				IMSDK.unsubscribe(IMSDK.IMEvents.OnGroupMemberInfoChanged, this.groupMemberInfoChangeHandler)
			}
		},
	}
</script>

<style lang="scss" scoped>
	.user_card_container {
		@include colBox(false);
		height: 100vh;
		background-color: #F6F6F6;
		overflow-y: auto;
		position: relative;

		.base_info {
			@include vCenterBox();
			background-color: #fff;
			padding: 44rpx;
			margin-bottom: 18rpx;

			.u-avatar {
				margin-right: 24rpx;
			}

			.user_name {
				display: flex;
				margin-bottom: 12rpx;

				.text {
					@include nomalEllipsis();
					max-width: 300rpx;
				}
			}

			.company {
				font-size: 28rpx;
				color: $u-primary;
			}

		}

		.info_row {
			background-color: #fff;
			margin-bottom: 24rpx;
		}

		.mute_right {
			display: flex;
			align-items: center;
		}

		.company_row {
			padding: 20rpx 0;

			.desc_title {
				padding-left: 44rpx;
			}

			.company_info {}

			/deep/.title {
				width: 200rpx;
				color: #999 !important;
			}

		}

		.action_row {
			@include vCenterBox();
			justify-content: space-around;
			margin: 44rpx;
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;

			.action_item {
				@include colBox(false);
				align-items: center;
				color: $u-primary;

				img {
					width: 100rpx;
					height: 100rpx;
					margin-bottom: 12rpx;
				}
			}
		}

		.online_state {
			@include vCenterBox();
			margin-left: 24rpx;
			font-size: 24rpx;
			color: #999;

			.dot {
				background-color: #10CC64;
				width: 12rpx;
				height: 12rpx;
				border-radius: 50%;
				margin-right: 12rpx;
			}

			.online_str {
				@include nomalEllipsis();
				max-width: 280rpx;
			}
		}
	}
</style>