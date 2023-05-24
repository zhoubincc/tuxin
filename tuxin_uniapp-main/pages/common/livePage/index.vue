<template>
	<view class="web_view_wrap">
		<web-view allow="microphone;camera;midi;encrypted-media;" :src="hybridUrl" @message="handleMessage">
		</web-view>
	</view>
</template>

<script>
	import IMSDK from '@/util/compatibleIM'
	import {
		CustomMessageStatus,
		CustomType,
		GroupMemberListTypes,
		PageEvents,
		SessionType
	} from '@/constant';
	import {
		gotoAppPermissionSetting,
		judgeIosPermission,
		requestAndroidPermission
	} from '@/util/permission';
	import beCalledRing from '@/static/audio/beCalled.mp3'
	import callingRing from '@/static/audio/calling.wav'

	let currentWebview
	let innerAudioContext

	const RtcMessageTypes = {
		Accept: 'accept',
		Refuse: 'refuse',
		Cancel: 'cancel',
		Hung: 'hung',
		Disconnect: 'disconnect',
		ConnectFailed: 'connectFailed',
		Invite: 'invite'
	}



	export default {
		data() {
			return {
				callState: {
					isGroup: true,
					isVideo: true,
					isCalled: true,
				},
				invitationData: {},
				connectData: {},
				hybridUrl: '/hybrid/html/h5/index.html',
			};
		},
		onLoad(options) {
			const data = JSON.parse(options.invitationData)
			this.invitationData = data.invitation
			this.callState.isGroup = this.invitationData.sessionType !== SessionType.Single
			this.callState.isVideo = this.invitationData.mediaType === 'video'
			this.callState.isCalled = JSON.parse(options.isCalled)
			if (options.connectData) {
				this.connectData = JSON.parse(options.connectData)
			}
			const connectDataStr = this.callState.isGroup && options.connectData ? `&connectData=${options.connectData}` :
				''
			const participantStr = data.participant ? `&participantInfo=${JSON.stringify(data.participant)}` : ''
			const invitedMemberStr = options.memberList ? `&invitedMemberInfo=${options.memberList}` : ''
			this.hybridUrl = this.hybridUrl +
				`?isCalled=${options.isCalled}&isGroup=${this.callState.isGroup}&isVideo=${this.callState.isVideo}&totalMember=${data.invitation.inviteeUserIDList.length+1}&statusBarHeight=${uni.getWindowInfo().statusBarHeight}` +
				connectDataStr + participantStr + invitedMemberStr
			console.log(this.hybridUrl);
			this.setRTCListener();
			this.backPlayRing(this.callState.isCalled ? beCalledRing : callingRing)
		},
		onReady() {
			this.checkRecordPermission()
			setTimeout(() => {
				currentWebview = this.$scope.$getAppWebview().children()[0]
				currentWebview.setStyle({
					top: uni.getWindowInfo().statusBarHeight
				})
			});
		},
		onUnload() {
			this.disposeRTCListener();
			innerAudioContext?.destroy();
			console.log('destroy');
		},
		methods: {
			backPlayRing(audioSrc) {
				if (this.callState.isGroup && !this.callState.isCalled) {
					return;
				}
				innerAudioContext = uni.createInnerAudioContext();
				innerAudioContext.autoplay = true;
				innerAudioContext.src = audioSrc;
				innerAudioContext.loop = true;
			},
			handleMessage({
				detail: {
					data
				}
			}) {
				const type = data[0].type
				switch (type) {
					case RtcMessageTypes.Accept:
						this.acceptInvite();
						innerAudioContext.stop();
						break;
					case RtcMessageTypes.Refuse:
						this.refuseInvite();
						innerAudioContext.stop();
						break;
					case RtcMessageTypes.Cancel:
						this.cancelInvite();
						innerAudioContext.stop();
						break;
					case RtcMessageTypes.Hung:
						this.insertRtcMessage(CustomMessageStatus.Success, data[0].duration)
						uni.navigateBack();
						break;
					case RtcMessageTypes.Disconnect:
						this.insertRtcMessage(CustomMessageStatus.Success, data[0].duration)
						uni.navigateBack();
						break;
					case RtcMessageTypes.ConnectFailed:
						uni.$u.toast('连接失败！')
						uni.navigateBack();
						break;
					case RtcMessageTypes.Invite:
						uni.$u.route('/pages/conversation/groupMemberList/index', {
							type: GroupMemberListTypes.CallInvite,
							groupID: this.invitationData.groupID,
							callMediaType: this.invitationData.mediaType
						})
						break;
					default:
						break;
				}
			},
			sendRtcInvite(mediaType, userIDList) {
				const invitation = {
					...this.invitationData,
					inviteeUserIDList: userIDList
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.SignalingInviteInGroup, IMSDK.uuidv4(), {
						invitation
					})
					.then(({
						data
					}) => {
						console.log(data);
						uni.$u.toast('邀请成功！')
					}).catch((err) => {
						console.log(err);
						uni.$u.toast('邀请失败！')
					})
			},
			async checkRecordPermission() {
				if (uni.$u.os() === 'ios') {
					const iosFlag = judgeIosPermission('record')
					const iosFlag2 = judgeIosPermission('camera')
					if (iosFlag === 0 || !iosFlag2) {
						uni.$u.toast('您已禁止访问麦克风或摄像头，请前往开启')
						setTimeout(() => gotoAppPermissionSetting(), 250)
						return false
					}
				} else {
					const androidFlag = await requestAndroidPermission('android.permission.RECORD_AUDIO')
					const androidFlag2 = await requestAndroidPermission('android.permission.CAMERA')
					if (androidFlag === -1 || androidFlag2 === -1) {
						uni.$u.toast('您已禁止访问麦克风或摄像头，请前往开启')
						setTimeout(() => gotoAppPermissionSetting(), 250)
						return false
					}
				}
				return true
			},
			async acceptInvite() {
				const options = {
					opUserID: this.$store.getters.storeCurrentUserID,
					invitation: this.invitationData
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.SignalingAccept, IMSDK.uuidv4(), options)
					.then(({
						data
					}) => {
						console.log(data);
						console.log(currentWebview);
						currentWebview.evalJS(`acceptCallback(${JSON.stringify(data)})`)
					})
			},
			refuseInvite() {
				const options = {
					opUserID: this.$store.getters.storeCurrentUserID,
					invitation: this.invitationData
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.SignalingReject, IMSDK.uuidv4(), options)
					.finally(() => {
						this.insertRtcMessage(CustomMessageStatus.Refuse);
						uni.navigateBack()
					})
			},
			cancelInvite() {
				const options = {
					opUserID: this.$store.getters.storeCurrentUserID,
					invitation: this.invitationData
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.SignalingCancel, IMSDK.uuidv4(), options)
					.finally(() => {
						this.insertRtcMessage(CustomMessageStatus.Cancel)
						uni.navigateBack();
					})
			},
			insertRtcMessage(status, timeStr) {
				const customData = {
					customType: CustomType.Call,
					data: {
						duration: timeStr ?? "",
						type: this.callState.isVideo ? CustomType.VideoCall : CustomType.VoiceCall,
						status,
					},
				};
				const message = IMSDK.IMApi.createCustomMessage(IMSDK.uuidv4(), customData, {}, "RTC")
				const sourceID = this.invitationData.groupID || this.invitationData.inviteeUserIDList[0]
				const funcName = this.callState.isGroup ? IMSDK.IMMethods.InsertGroupMessageToLocalStorage : IMSDK
					.IMMethods.InsertSingleMessageToLocalStorage
				IMSDK.compatibleAPI(funcName, IMSDK.uuidv4(), message, sourceID, this.invitationData.inviterUserID)
					.then(({
						data
					}) => {
						if (this.inCurrentConversation(data)) {
							data.isAppend = true;
							this.$store.dispatch('message/pushNewMessage', data);
							setTimeout(() =>
								uni.$emit(
									PageEvents.ScrollToBottom,
									true
								)
							);
						}
					}).catch(err => {
						console.log(err);
					})
			},
			inCurrentConversation(newServerMsg) {
				if (this.callState.isGroup) {
					return newServerMsg.groupID === this.$store.getters.storeCurrentConversation.groupID;
				}
				return (
					newServerMsg.sendID === this.$store.getters.storeCurrentConversation.userID ||
					newServerMsg.recvID === this.$store.getters.storeCurrentConversation.userID
				);
			},

			acceptHandler() {
				console.log('acceptHandler');
				innerAudioContext.stop();
				currentWebview.evalJS(`acceptCallback(${JSON.stringify(this.connectData)})`)
			},
			refusedHandler({
				data
			}) {
				console.log(data);
				uni.$u.toast('对方已拒绝！')
				this.insertRtcMessage(CustomMessageStatus.Refused)
				uni.navigateBack()
			},
			accessByOtherDeviceHandler({
				data
			}) {
				console.log(data);
				uni.$u.toast('已在其他设备上处理！')
				this.insertRtcMessage(CustomMessageStatus.AccessByOther)
				uni.navigateBack()
			},
			canceledHandler({
				data
			}) {
				console.log(data);
				const canceledData = JSON.parse(data);
				if (canceledData.opUserID === this.invitationData.inviterUserID) {
					uni.$u.toast('对方已取消！')
					this.insertRtcMessage(CustomMessageStatus.Canceled)
					uni.navigateBack()
				}
			},
			timeOutHandler({
				data
			}) {
				console.log(data);
				uni.$u.toast('对方未接听！')
				this.insertRtcMessage(CustomMessageStatus.Timeout)
				uni.navigateBack()
			},
			setRTCListener() {
				IMSDK.subscribe(IMSDK.IMEvents.OnInviteeAccepted, this.acceptHandler)
				IMSDK.subscribe(IMSDK.IMEvents.OnInviteeRejected, this.refusedHandler)
				IMSDK.subscribe(IMSDK.IMEvents.OnInviteeAcceptedByOtherDevice, this.accessByOtherDeviceHandler)
				IMSDK.subscribe(IMSDK.IMEvents.OnInviteeRejectedByOtherDevice, this.accessByOtherDeviceHandler)
				IMSDK.subscribe(IMSDK.IMEvents.OnInvitationCancelled, this.canceledHandler)
				IMSDK.subscribe(IMSDK.IMEvents.OnInvitationTimeout, this.timeOutHandler)
			},
			disposeRTCListener() {
				IMSDK.unsubscribe(IMSDK.IMEvents.OnInviteeAccepted, this.acceptHandler)
				IMSDK.unsubscribe(IMSDK.IMEvents.OnInviteeRejected, this.refusedHandler)
				IMSDK.unsubscribe(IMSDK.IMEvents.OnInviteeAcceptedByOtherDevice, this.accessByOtherDeviceHandler)
				IMSDK.unsubscribe(IMSDK.IMEvents.OnInviteeRejectedByOtherDevice, this.accessByOtherDeviceHandler)
				IMSDK.unsubscribe(IMSDK.IMEvents.OnInvitationCancelled, this.canceledHandler)
				IMSDK.unsubscribe(IMSDK.IMEvents.OnInvitationTimeout, this.timeOutHandler)
			}
		},
		onBackPress(options) {
			if (options.from === 'navigateBack' || !currentWebview) {
				if(currentWebview){
					currentWebview.evalJS(`tryDisconnectAgin()`)
				}
				return false;
			}
			currentWebview.evalJS(`backConfirm()`)
			return true
		}
	}
</script>

<style lang="scss" scoped>
	.web_view_wrap {
		margin-top: var(--status-bar-height);
	}
</style>