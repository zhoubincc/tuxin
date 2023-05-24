<template>
	<view v-if="!getNoticeContent" @click="clickMessageItem" :id="`auchor${source.clientMsgID}`" class="message_item"
		:class="{'message_item_self':isSender,'message_item_active': isActive}">
		<view v-if="mutipleCheckVisible" class="check_wrap"
			:class="{'check_wrap_active':source.checked,'check_wrap_disabled':false}">
			<u-icon v-show="source.checked" name="checkbox-mark" size="12" color="#fff" />
		</view>
		<my-avatar @longpress="atUser" @click="showInfo" size='42'
			:desc="announcePublisher.nickname || source.senderNickname"
			:src="announcePublisher.faceURL||source.senderFaceUrl" />
		<view class="message_container">
			<view class="message_sender">
				<text>{{announcePublisher.nickname || source.senderNickname}}</text>
			</view>
			<view @longpress.prevent="showMenu" class="message_content_wrap">
				<text-message-render v-if="showTextRender" :message="source" />
				<media-message-render v-else-if="showMediaRender" :message="source" />
				<audio-message-render v-else-if="showAudioRender" :message="source" :isSender='isSender' />
				<file-message-render v-else-if="showFileRender" :message="source" />
				<card-message-render v-else-if="showCardRender" :message="source" />
				<merge-message-render v-else-if="showMergeRender" :message="source" />
				<location-message-render v-else-if="showLocationRender" :message="source" />
				<group-announce-render v-else-if="showGroupAnnouncement" :message="source" />
				<rtc-message-render v-else-if="rtcMessageData" :data="rtcMessageData" :isSender='isSender' />
				<error-message-render v-else />

			</view>
			<quote-message-render :message="source" v-if="isQuoteMessage" />
			<message-read-state :message="source" v-if="isSender && isSuccessMessage && !showGroupAnnouncement && !isPreview && !rtcMessageData" />

			<transition name="fade">
				<message-menu v-if="menuState.visible" :message="source" :isSender='isSender'
					:is_bottom="menuState.isBottom" :paterWidth="menuState.paterWidth" @close="menuState.visible = false" />
			</transition>
		</view>
		<view class="message_send_state">
			<u-loading-icon v-if="showSending && !isPreview" />
			<image @click="reSendMessage" v-if="isFailedMessage && !isPreview" src="@/static/images/chating_message_failed.png"/>
				<text v-if="readLimitSensitive" class="read_limit_count">{{`${count}s`}}</text>
		</view>

	</view>

	<view v-else class="notice_message_container" :id="`auchor${source.clientMsgID}`">
		<text>{{getNoticeContent}}</text>
	</view>
</template>

<script>
	import IMSDK from '@/util/compatibleIM'
	import MyAvatar from '@/components/MyAvatar/index.vue'
	import ChatingList from '../ChatingList.vue'
	import TextMessageRender from './TextMessageRender.vue'
	import MediaMessageRender from './MediaMessageRender.vue'
	import AudioMessageRender from './AudioMessageRender.vue'
	import FileMessageRender from './FileMessageRender.vue'
	import CardMessageRender from './CardMessageRender.vue'
	import MergeMessageRender from './MergeMessageRender.vue'
	import QuoteMessageRender from './QuoteMessageRender.vue'
	import LocationMessageRender from './LocationMessageRender.vue'
	import GroupAnnounceRender from './GroupAnnounceRender.vue'
	import RtcMessageRender from './RTCMessageRender.vue'
	import ErrorMessageRender from './ErrorMessageRender.vue'
	import MessageMenu from './MessageMenu.vue'
	import MessageReadState from './MessageReadState.vue'
	import {
		CustomType,
		GroupAllowTypes,
		MessageStatus,
		MessageType,
		noticeMessageTypes,
		PageEvents,
		SessionType,
		UpdateMessageTypes
	} from "@/constant"
	import {
		formatConversionTime,
		tipMessaggeFormat
	} from "@/util/imCommon"

	const textRenderTypes = [
		MessageType.TEXTMESSAGE,
		MessageType.ATTEXTMESSAGE,
		MessageType.QUOTEMESSAGE,
	]

	const mediaRenderTypes = [
		MessageType.VIDEOMESSAGE,
		MessageType.PICTUREMESSAGE,
	]

	export default {
		components: {
			MyAvatar,
			TextMessageRender,
			MediaMessageRender,
			AudioMessageRender,
			FileMessageRender,
			CardMessageRender,
			MergeMessageRender,
			QuoteMessageRender,
			LocationMessageRender,
			GroupAnnounceRender,
			RtcMessageRender,
			ErrorMessageRender,
			MessageMenu,
			MessageReadState
		},
		props: {
			source: Object,
			isSender: {
				type: Boolean,
				default: false
			},
			mutipleCheckVisible: {
				type: Boolean,
				default: false
			},
			menuOutsideFlag: Number,
			isPreview: Boolean,
			isActive: Boolean
		},
		data() {
			return {
				menuState: {
					visible: false,
					isBottom: false,
					paterWidth: false,
					sendingDelay: true,
				},
				count: 30,
				timer: null,
				announcePublisher: {}
			}
		},
		computed: {
			showTextRender() {
				return textRenderTypes.includes(this.source.contentType)
			},
			showMediaRender() {
				return mediaRenderTypes.includes(this.source.contentType)
			},
			showAudioRender() {
				return this.source.contentType === MessageType.VOICEMESSAGE
			},
			showFileRender() {
				return this.source.contentType === MessageType.FILEMESSAGE
			},
			showCardRender() {
				return this.source.contentType === MessageType.CARDMESSAGE
			},
			showMergeRender() {
				return this.source.contentType === MessageType.MERGERMESSAGE
			},
			showLocationRender() {
				return this.source.contentType === MessageType.LOCATIONMESSAGE
			},
			rtcMessageData() {
				if(this.source.contentType === MessageType.CUSTOMMESSAGE){
					try{
						const customData = JSON.parse(this.source.customElem.data)
						if(customData.customType === CustomType.Call){
							return customData.data
						}
					}catch(e){}
				}
				return null
			},
			showGroupAnnouncement() {
				if (this.source.contentType === MessageType.GROUPINFOUPDATED) {
					let detail
					try {
						detail = JSON.parse(this.source.notificationElem?.detail)
					} catch (e) {}
					return detail?.group.notification !== undefined
				}
				return false
			},
			getNoticeContent() {
				if (this.showGroupAnnouncement) {
					return ''
				}
				const isNoticeMessage = noticeMessageTypes.includes(this.source.contentType)
				return !isNoticeMessage ? '' : tipMessaggeFormat(this.source, this.$store.getters.storeCurrentUserID)
			},
			isQuoteMessage() {
				return this.source.contentType === MessageType.QUOTEMESSAGE || this.source.atElem?.quoteMessage
			},
			isSuccessMessage() {
				return this.source.status === MessageStatus.Succeed
			},
			isFailedMessage() {
				return this.source.status === MessageStatus.Failed
			},
			showSending() {
				return this.source.status === MessageStatus.Sending && !this.sendingDelay
			},
			readLimitSensitive() {
				return this.source.attachedInfoElem?.isPrivateChat && this.source.isRead && !this.isPreview
			},
		},
		mounted() {
			this.$emit('messageItemRender', this.source.clientMsgID);
			this.isReadObserver();
			this.setSendingDelay();
			this.count = this.source.attachedInfoElem?.burnDuration || 30
		},
		beforeDestroy() {
			if(this.count !== 0 && !this.isPreview){
				this.checkPrivateMessage();
			}
		},
		watch: {
			menuOutsideFlag(newVal) {
				if (this.menuState.visible) {
					this.menuState.visible = false
				}
			},
			readLimitSensitive: {
				handler(newVal) {
					if (newVal) {
						this.startCount();
					}
				},
				immediate: true
			},
			showGroupAnnouncement: {
				handler(newVal) {
					if (newVal) {
						this.getAnnouncementPublisher();
					}
				},
				immediate: true
			}
		},
		methods: {
			reSendMessage() {
				IMSDK.IMApi.sendMessage(IMSDK.uuidv4(), JSON.stringify(this.source), this.source
					.recvID ?? "", this.source.groupID ?? "", IMSDK.offlinePushInfo);
			},
			async showMenu() {
				if(this.isPreview || this.showGroupAnnouncement) {
					return;
				}
				uni.createSelectorQuery().in(this).select('.message_content_wrap')
					.boundingClientRect(res => {
						console.log(res.top);
						this.menuState.paterWidth = res.width
						this.menuState.isBottom = res.top < 250
						this.menuState.visible = true
					}).exec()
			},
			getAnnouncementPublisher() {
				let group = {}
				try {
					group = JSON.parse(this.source.notificationElem.detail).group
				} catch (e) {}
				if (!group.notificationUserID) return;
				IMSDK.compatibleAPI(IMSDK.IMMethods.GetGroupMembersInfo, IMSDK.uuidv4(), group.groupID, [group
						.notificationUserID
					])
					.then(({
						data
					}) => this.announcePublisher = data[0] ?? {})
			},
			checkPrivateMessage() {
				if (this.source.attachedInfoElem.isPrivateChat) {
					this.clearPrivateMessage();
				}
				if (this.timer) {
					clearInterval(this.timer)
				}
			},
			startCount() {
				this.timer = setInterval(() => {
					if (this.count > 0) {
						this.count-=1;
					} else {
						this.checkPrivateMessage()
					}
				}, 1000)
			},
			clearPrivateMessage() {
				IMSDK.compatibleAPI(IMSDK.IMMethods.DeleteMessageFromLocalAndSvr, IMSDK.uuidv4(), this.source)
					.then(() => {
						this.$store.dispatch('message/deleteMessages', [this.source])
					}).catch(() => uni.$u.toast('删除失败'))
			},
			setSendingDelay() {
				if (this.source.status === MessageStatus.Sending) {
					setTimeout(() => {
						this.sendingDelay = false
					}, 2000)
				}
			},
			isReadObserver() {
				if (this.isPreview || this.isSender || this.source.isRead === true || this.source.sessionType === SessionType.Notification ||
					noticeMessageTypes.includes(this.source.contentType)) {
					return;
				}

				const observer = uni.createIntersectionObserver(ChatingList)
				observer.relativeTo('#scroll_view').observe(`#auchor${this.source.clientMsgID}`, ({
					intersectionRatio
				}) => {
					console.log(this.source.clientMsgID, intersectionRatio);
					if (intersectionRatio > 0) {
						const funcName = this.source.sessionType === SessionType.Single ? IMSDK.IMMethods
							.MarkC2CMessageAsRead : IMSDK.IMMethods.MarkGroupMessageAsRead;
						const sourceID = this.source.groupID || this.source.sendID
						if (this.source.isAppend){
							this.$store.dispatch('message/updateOneMessage',{
								message: this.source,
								type: UpdateMessageTypes.KeyWords,
								keyWords: {
									key: 'isAppend',
									value: false
								}
							})
						}
						IMSDK.compatibleAPI(funcName, IMSDK.uuidv4(), sourceID, [this.source.clientMsgID]).then(()=>{
							this.source.isRead = true
						})
						observer.disconnect()
					}
				})
			},
			atUser() {
				if (!this.isSender && this.source.groupID && !this.isPreview) {
					uni.$emit(PageEvents.AtSomeOne, {
						userID: this.source.sendID,
						nickname: this.source.senderNickname
					})
				}
			},
			showInfo() {
				if (this.isSender || this.showGroupAnnouncement || this.isPreview) {
					return;
				}

				if (this.source.sessionType === SessionType.Single) {
					uni.navigateTo({
						url: `/pages/common/userCard/index?sourceID=${this.source.sendID}`
					})
				} else {

					if (this.$store.getters.storeCurrentGroup.lookMemberInfo === GroupAllowTypes.NotAllowed) {
						return;
					}
					IMSDK.compatibleAPI(IMSDK.IMMethods.GetGroupMembersInfo, IMSDK.uuidv4(), this.source.groupID, [this
						.source.sendID
					]).then(({
						data
					}) => {
						const member = data[0]
						const memberStr = member ? `&=${JSON.stringify(member)}` : ''
						uni.$u.route('/pages/common/userCard/index', {
							sourceID: this.source.sendID,
							memberInfo: member ? JSON.stringify(member) : '',
							disableAdd: this.$store.getters.storeCurrentGroup.applyMemberFriend === GroupAllowTypes.NotAllowed
						})
					})

				}
			},
			clickMessageItem() {
				if (this.mutipleCheckVisible) {
					this.$store.dispatch('message/updateOneMessage', {
						message: {
							...this.source,
							checked: !this.source.checked
						},
					})
				}
			}
		}
	}
</script>

<style scoped lang="scss">
	.message_item {
		display: flex;
		flex-direction: row;
		padding: 16rpx 44rpx;
		// padding-top: 48rpx;
		position: relative;

		.check_wrap {
			@include centerBox();
			box-sizing: border-box;
			width: 40rpx;
			min-width: 40rpx;
			height: 40rpx;
			min-height: 40rpx;
			border: 2px solid #979797;
			border-radius: 50%;
			margin-top: 16rpx;
			margin-right: 24rpx;

			&_active {
				background-color: #1D6BED;
				border: none;
			}

			&_disabled {
				background-color: #c8c9cc;
			}
		}

		.message_container {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			margin-left: 24rpx;
			// text-align: start;
			max-width: 80%;
			position: relative;

			.message_sender {
				@include nomalEllipsis();
				max-width: 480rpx;
				// font-size: 24rpx;
				font-size: 0.85rem;
				color: #666;
				margin-bottom: 6rpx;
			}


			.message_content_wrap {
				@include vCenterBox();
				@include ellipsisWithLine(10);
				text-align: start;
				// font-size: 14px;
				color: $uni-text-color;
				width: fit-content;
				max-width: 100%;

				.bg_container {
					padding: 16rpx 24rpx;
					border-radius: 8rpx;
					background-color: #F0F0F0;
				}

			}

		}

		.message_send_state {
			@include centerBox();
			margin-left: 12rpx;
			margin-top: 48rpx;
			width: 48rpx;
			height: 48rpx;

			.read_limit_count {
				// font-size: 24rpx;
				font-size: 0.85rem;
				color: #999;
			}

			image {
				width: 16px;
				height: 16px;
			}
		}

		/deep/.emoji_display {
			width: 24px;
			height: 18px;
			vertical-align: sub;
		}



		&_self {
			flex-direction: row-reverse;

			.check_wrap {
				margin-right: 0;
				margin-left: 24rpx;
			}

			.message_container {
				margin-left: 0;
				margin-right: 24rpx;
				// text-align: end;
				align-items: flex-end;

				.message_content_wrap {
					flex-direction: row-reverse;

					.bg_container {
						background-color: #DCEBFE !important;
					}
				}


			}

			.message_send_state {
				margin-left: 0rpx;
				margin-right: 12rpx;
			}
		}
		
		&_active {
			background-color: #FDF5E9;
		}
	}

	.notice_message_container {
		@include ellipsisWithLine(2);
		text-align: center;
		margin: 24rpx 48rpx;
		// font-size: 24rpx;
		font-size: 0.85rem;
		color: #999;
	}


	.fade-leave,
	.fade-enter-to {
		opacity: 1;
	}

	.fade-leave-active,
	.fade-enter-active {
		transition: all 0.5s;
	}

	.fade-leave-to,
	.fade-enter {
		opacity: 0;
	}
</style>
