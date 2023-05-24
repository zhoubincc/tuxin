<template>
	<u-navbar @click="click" placeholder class="chating_header">
		<view @click="routeBack" class="u-nav-slot" slot="left">
			<img class="back_icon" width="12" height="20" src="static/images/common_left_arrow.png" alt="" srcset="">
		</view>
		<view class="u-nav-slot" slot="center">
			<view class="chating_info" :class="{'chating_info_single':isSingle}">
				<view class="conversation_info">
					<view class="title">{{storeCurrentConversation.showName}}</view>
					<view v-if="!isSingle && !isNotify" class="sub_title">{{groupMemberCount}}
					</view>
				</view>
				<view v-if="isSingle" class="online_state">
					<view v-show="!isTyping" class="dot" :style="{backgroundColor:isOnline ? '#10CC64' : '#999'}" />
					<view class="online_str" v-show="!isTyping">{{onlineStr}}</view>
					<text v-show="isTyping">正在输入...</text>
				</view>
			</view>

			<view v-if="showGroupAnnouncement" @click="toGroupAnnouncement" class="group_announcement_tab">
				<image src="@/static/images/chating_message_notice.png" mode=""></image>
				<view class="announcement_content">
					{{getGroupAnnouncementContent}}
				</view>
				<u-icon name="arrow-right" color="#999"></u-icon>
			</view>
			<view class="group_calling_tab" v-if="callingData">
				<view class="base_row" @click="showMoreMember = !showMoreMember">
					<image src="@/static/images/group_calling_icon.png" />
					<text>{{`${callingData.participant.length}人正在${callingData.invitation.mediaType === 'video'?'视频':'语音'}通话`}}</text>
					<image class="arrow" src="@/static/images/group_calling_arrow.png" />
				</view>
				<view class="member_row" v-show="showMoreMember">
					<my-avatar size="42" :src="item.groupMemberInfo.faceURL" :desc="item.groupMemberInfo.nickname"
						v-for="item in callingData.participant.slice(0,11)" :key="item.userInfo.userID" />
				</view>
				<view class="action_row" v-show="showMoreMember" @click="joinRtc">
					<text>加入</text>
				</view>
			</view>
		</view>
		<view class="u-nav-slot" slot="right">
			<view class="right_action">
				<img @click="routeCall" class="action_item" width="23" height="23" src="static/images/common_call.png"
					alt="" srcset="">
				<u-icon @click="goSetting" class="action_item" name="more-dot-fill" size="23" color="#333">
				</u-icon>
			</view>
		</view>
	</u-navbar>
</template>

<script>
	import {
		mapGetters,
		mapActions
	} from "vuex";
	import {
		GroupAtType,
		PageEvents,
		SessionType,
	} from '@/constant'
	import {
		getDesignatedUserOnlineState,
	} from '@/util/imCommon'
	import IMSDK from '@/util/compatibleIM'
	import MyAvatar from '@/components/MyAvatar/index.vue'
	export default {
		name: 'ChatingHeader',
		components: {
			MyAvatar
		},
		data() {
			return {
				isOnline: false,
				isTyping: false,
				onlineStr: '离线',
				callingData: null,
				showMoreMember: false,
				joinLock: false
			}
		},
		computed: {
			...mapGetters(['storeCurrentConversation', 'storeCurrentGroup']),
			isSingle() {
				return this.storeCurrentConversation.conversationType === SessionType.Single
			},
			isNotify() {
				return this.storeCurrentConversation.conversationType === SessionType.Notification
			},
			groupMemberCount() {
				return `(${this.storeCurrentGroup?.memberCount??0})`
			},
			showGroupAnnouncement() {
				return this.$store.getters.storeCurrentConversation.groupAtType === GroupAtType.AtGroupNotice
			},
			getGroupAnnouncementContent() {
				if (this.showGroupAnnouncement) {
					return this.$store.getters.storeCurrentGroup.notification
				}
				return ''
			}
		},
		mounted() {
			this.checkOnline();
		},
		methods: {
			click(e) {
				this.$emit('click', e)
			},
			routeBack() {
				uni.navigateBack()
			},
			goSetting() {
				const url = this.isSingle ? '/pages/conversation/singleSettings/index' :
					'/pages/conversation/groupSettings/index'
				uni.navigateTo({
					url
				})
			},
			joinRtc() {
				IMSDK.callingModule.joinRoomLiveChat(this.callingData)
			},
			routeCall() {
				uni.$emit(PageEvents.RtcCall)
			},
			async getOnlineState() {
				getDesignatedUserOnlineState(this.storeCurrentConversation.userID).then((str) => {
					console.log('getOnlineState', str);
					this.isOnline = str !== '离线'
					this.onlineStr = str
				}).catch((err) => {
					console.log(err);
					this.isOnline = false
				})
			},
			updateTyping() {
				if (this.isTyping) {
					return;
				}
				this.isTyping = true;
				setTimeout(() => {
					this.isTyping = false;
				}, 1500);
			},
			updateCallingData(data) {
				this.callingData = data
			},
			checkOnline() {
				if (!this.isOnline && this.isSingle) {
					this.getOnlineState();
				}
			},
			toGroupAnnouncement() {
				IMSDK.compatibleAPI(IMSDK.IMMethods.ResetConversationGroupAtType, IMSDK.uuidv4(), this.$store.getters
					.storeCurrentConversation
					.conversationID);
				uni.navigateTo({
					url: `/pages/conversation/groupAnnouncement/index`
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.chating_header {
		/deep/ .u-navbar__content__left {
			padding: 0;
		}

		.back_icon {
			padding: 24rpx;
			margin-left: 20rpx;
		}

		.chating_info {
			&_single {
				margin-bottom: 24rpx;
			}

			.conversation_info {
				@include vCenterBox();

				.title {
					@include nomalEllipsis();
					max-width: 280rpx;
					font-size: 14px;
					font-weight: 500;
				}

				.sub_title {
					margin-left: 8rpx;
				}
			}



			.online_state {
				@include vCenterBox();
				flex-direction: row;
				position: absolute;
				bottom: 2px;
				left: 50%;
				transform: translateX(-50%);
				font-size: 20rpx;
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

		/deep/ .u-navbar__content__right {
			padding: 0;
		}

		.right_action {
			@include vCenterBox();
			flex-direction: row;
			margin-right: 24rpx;

			.action_item {
				padding: 12rpx;
			}

			.u-icon {
				margin-left: 12rpx;
			}
		}
	}

	.group_announcement_tab {
		display: flex;
		align-items: center;
		position: absolute;
		left: 0;
		// bottom: -44px;
		margin: 40rpx 24rpx 0;
		padding: 14rpx 32rpx;
		background-color: #F0F6FF;
		border-radius: 12rpx;

		.announcement_content {
			@include ellipsisWithLine(2);
			margin: 0 12rpx;
			font-size: 24rpx;
			color: #617183;
		}

		image {
			width: 16px;
			height: 16px;
			min-width: 16px;
		}
	}

	.group_calling_tab {
		position: absolute;
		left: 0;
		width: 80%;
		margin-top: 12px;
		margin-left: 5%;
		padding: 24rpx;
		background-color: #f4f9ff;
		border-radius: 8rpx;
		color: #5496EB;
		font-size: 24rpx;

		.base_row {
			display: flex;
			align-items: center;

			image {
				width: 10px;
				height: 10px;
			}

			text {
				margin-left: 16rpx;
			}

			.arrow {
				width: 9px;
				height: 6px;
				position: absolute;
				right: 24rpx;
			}
		}

		.member_row {
			display: flex;
			// justify-content: space-between;
			flex-wrap: wrap;
			padding: 24rpx 28rpx;
			margin-top: 24rpx;
			background-color: #fff;
			border-bottom: 1px solid rgba(151, 151, 151, 0.16);
			border-top-left-radius: 8rpx;
			border-top-right-radius: 8rpx;

			.u-avatar {
				margin-bottom: 16rpx;

				&:not(:nth-child(6n)) {
					margin-right: calc(6% / 2);
				}
			}
		}

		.action_row {
			display: flex;
			justify-content: center;
			padding: 24rpx;
			background-color: #fff;
			font-size: 28rpx;
			border-bottom-left-radius: 8rpx;
			border-bottom-right-radius: 8rpx;
		}
	}
</style>
