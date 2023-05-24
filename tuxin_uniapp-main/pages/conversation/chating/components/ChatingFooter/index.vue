<template>
	<view :snapFlag="snapFlag" :change:snapFlag="snap.getSnapFlagUpdate"
		:style="{'pointer-events':getPlaceholder ? 'none' :'auto'}">
		<view class="chat_footer">
			<img @click="updateRecordBtn" style="width: 26px;height: 26px;"
				:src="showRecord ? 'static/images/chating_footer_audio_recording.png' : 'static/images/chating_footer_audio.png'">
			<view class="input_content">
				<CustomEditor :placeholder="getPlaceholder" v-show="!showRecord" class="custom_editor"
					ref="customEditor" @ready="editorReady" @focus="editorFocus" @blur="editorBlur"
					@input="editorInput" />
				<view v-if="storeQuoteMessage" class="quote_message">
					<view class="content">
						<u-parse :content="getQuotedContent" />
					</view>
					<image @click="cancelQuote" style="width: 16px;height: 16px;"
						src="@/static/images/chating_footer_quote_close.png" alt="" />
				</view>
				<button class="record_btn" @longpress="longpressRecord" @touchmove="touchMoveSpeech"
					@touchend="endRecord" v-show='showRecord' customStyle="height:30px;" type="primary">
					按住说话
				</button>
			</view>

			<view class="footer_action_area">
				<image @click="updateEmojiBar" class="emoji_action" src="@/static/images/chating_footer_emoji.png"
					alt="" srcset="" />
				<image v-show="!hasContent" @click.prevent="updateActionBar"
					src="@/static/images/chating_footer_add.png" alt="" srcset="" />
				<view class="send_btn" @touchend.prevent="sendTextMessage" v-show="hasContent && !emojiBarVisible">
					发送
				</view>
				<view class="send_btn" @click.prevent="sendTextMessage" v-show="hasContent && emojiBarVisible">
					发送
				</view>
			</view>
		</view>
		<chating-action-bar @sendMessage="sendMessage" @prepareMediaMessage="prepareMediaMessage"
			v-show="actionBarVisible" />
		<chating-emoji-bar @emojiClick="emojiClick" @backspace="backspace" v-show="emojiBarVisible" />
		<u-action-sheet :safeAreaInsetBottom="true" round="12" :actions="actionSheetMenu" @select="selectClick"
			:closeOnClickOverlay="true" :closeOnClickAction="true" :show="showActionSheet"
			@close="showActionSheet=false">
		</u-action-sheet>
		<record-overlay @recordFinish="recordFinish" ref="recordOverlayRef" :visible="recording" />
	</view>
</template>

<script>
	import {
		mapGetters,
		mapActions
	} from "vuex";
	import {
		base64ToPath
	} from 'image-tools'
	import {
		formatInputHtml,
		getPurePath,
		html2Text
	} from "@/util/common"
	import {
		parseMessageByType,
	} from "@/util/imCommon"
	import {
		MessageStatus,
		ChatingFooterActionTypes,
		UpdateMessageTypes,
		SessionType,
		MessageType,
		GroupStatus,
		GroupMemberRole,
		GroupMemberListTypes,
	} from "@/constant"
	import IMSDK from '@/util/compatibleIM'
	import UParse from '@/components/gaoyia-parse/parse.vue'
	import CustomEditor from "./CustomEditor.vue"
	import ChatingActionBar from "./ChatingActionBar.vue"
	import ChatingEmojiBar from "./ChatingEmojiBar.vue"
	import RecordOverlay from "./RecordOverlay.vue"
	import emojis from "@/common/emojis.js"
	import {
		gotoAppPermissionSetting,
		requestAndroidPermission,
		judgeIosPermission
	} from "@/util/permission";


	const needClearTypes = [
		MessageType.ADVANCETEXTMESSAGE,
		MessageType.TEXTMESSAGE,
		MessageType.ATTEXTMESSAGE,
		MessageType.QUOTEMESSAGE,
	]

	const albumChoose = [{
			name: '图片',
			type: ChatingFooterActionTypes.Album,
			idx: 0
		},
		{
			name: '视频',
			type: ChatingFooterActionTypes.Album,
			idx: 1
		}
	]
	const cameraChoose = [{
			name: '拍照',
			type: ChatingFooterActionTypes.Camera,
			idx: 0
		},
		{
			name: '录制',
			type: ChatingFooterActionTypes.Camera,
			idx: 1
		}
	]

	export default {
		components: {
			CustomEditor,
			ChatingActionBar,
			ChatingEmojiBar,
			UParse,
			RecordOverlay
		},
		props: {
			footerOutsideFlag: Number
		},
		data() {
			return {
				customEditorCtx: null,
				inputHtml: '',
				oldText: '',
				showRecord: false,
				actionBarVisible: false,
				emojiBarVisible: false,
				isInputFocus: false,
				actionSheetMenu: [],
				showActionSheet: false,
				snapFlag: null,
				recording: false,
				recordTop: uni.getWindowInfo().windowHeight - 130
			}
		},
		computed: {
			...mapGetters(['storeQuoteMessage', 'storeCurrentConversation', 'storeCurrentGroup',
				'storeCurrentMemberInGroup', 'storeBlackList'
			]),
			getQuotedContent() {
				if (!this.storeQuoteMessage) {
					return ""
				}
				return `回复${this.storeQuoteMessage.senderNickname}：${parseMessageByType(this.storeQuoteMessage)}`
			},
			hasContent() {
				return html2Text(this.inputHtml) !== ""
			},
			getPlaceholder() {
				const isSingle = this.storeCurrentConversation.conversationType === SessionType.Single
				if (!isSingle && this.storeCurrentGroup.status === GroupStatus.Muted) {
					return this.storeCurrentMemberInGroup.roleLevel !== GroupMemberRole.Nomal ? '' : '群主或管理员已开启全体禁言'
				}
				if (!isSingle && this.storeCurrentGroup.status === GroupStatus.Dismissed) {
					return '群聊已解散'
				}
				if (!isSingle && this.storeCurrentMemberInGroup.muteEndTime * 1000 > Date.now()) {
					const timeStr = dayjs(this.storeCurrentMemberInGroup.muteEndTime * 1000).format('YYYY/MM/DD HH:mm')
					return `你已被禁言至${timeStr}`
				}
				if (isSingle && this.storeBlackList.find(black => black.userID === this.storeCurrentConversation.userID)) {
					return '对方已被拉入黑名单'
				}
				return ''
			}
		},
		watch: {
			footerOutsideFlag(newVal) {
				this.onClickActionBarOutside();
				this.onClickEmojiBarOutside();
			},
		},
		mounted() {
			this.setSendMessageListener();
			this.setKeyboardListener();
		},
		beforeDestroy() {
			this.disposeSendMessageListener();
			this.disposeKeyboardListener();
		},
		methods: {
			...mapActions('message', ['pushNewMessage', 'updateOneMessage']),
			longpressRecord() {
				this.recording = true;
				this.$nextTick(() => this.getRecordAreaData())
			},
			touchMoveSpeech(e) {
				uni.$u.throttle(this.$refs.recordOverlayRef.touchMoveSpeech(e, this.recordTop), 250)
			},
			endRecord() {
				this.recording = false;
				this.$refs.recordOverlayRef.checkStopType();
			},
			recordFinish(path, duration) {
				const message = IMSDK.IMApi.createSoundMessageFromFullPath(IMSDK.uuidv4(), getPurePath(path), duration)
				this.sendMessage(message)
			},
			getRecordAreaData() {
				this.getEl('.record_area').then((data) => {
					if (data) {
						this.recordTop = data.top
					}
				})
			},
			getEl(el) {
				return new Promise((resolve) => {
					const query = uni.createSelectorQuery().in(this)
					query.select(el).boundingClientRect(data => {
						resolve(data)
					}).exec();
				})
			},
			createTextMessage() {
				let message = ''
				const {
					text,
					atUserList
				} = formatInputHtml(this.inputHtml)
				if (atUserList.length === 0) {
					if (this.storeQuoteMessage) {
						message = IMSDK.IMApi.createQuoteMessage(IMSDK.uuidv4(), text, JSON.stringify(this
							.storeQuoteMessage))
					} else {
						message = IMSDK.IMApi.createTextMessage(IMSDK.uuidv4(), text)
					}
				} else {
					const quoteMessage = this.storeQuoteMessage ? JSON.stringify(this.storeQuoteMessage) : ''
					message = IMSDK.IMApi.createTextAtMessage(IMSDK.uuidv4(), text, atUserList.map(item => item.atUserID),
						atUserList, quoteMessage);
				}
				return message
			},
			sendTextMessage() {
				// if(this.emojiBarVisible){
				// 	uni.hideKeyboard()
				// }
				if (!this.hasContent) return;
				const message = this.createTextMessage();
				this.sendMessage(message)
			},
			sendMessage(message) {
				const parsedMessage = JSON.parse(message)
				this.pushNewMessage(parsedMessage)
				if (needClearTypes.includes(parsedMessage.contentType)) {
					this.customEditorCtx.clear();
				}
				// this.$emit('scrollToBottom', parsedMessage.clientMsgID)
				this.$emit('scrollToBottom')
				IMSDK.IMApi.sendMessage(IMSDK.uuidv4(), message, this.storeCurrentConversation
					.userID, this.storeCurrentConversation.groupID, IMSDK.offlinePushInfo);
				this.cacheFrequentContacts();
				if (this.storeQuoteMessage) {
					this.$store.commit('message/SET_QUOTE_MESSAGE', undefined)
				}
			},
			cacheFrequentContacts() {
				if (!this.storeCurrentConversation
					.userID) return;
				const currentUserID = this.$store.getters.storeCurrentUserID
				const needCacheUserID = this.storeCurrentConversation
					.userID
				const cacheData = uni.getStorageSync(`${currentUserID}_frequentContacts`) || []
				const idx = cacheData.findIndex(user => user.userID === needCacheUserID)
				const nowTime = Date.now()
				if (idx === -1) {
					cacheData.push({
						userID: needCacheUserID,
						faceURL: this.storeCurrentConversation.faceURL,
						nickname: this.storeCurrentConversation.showName,
						updateTime: nowTime
					})
				} else {
					cacheData[idx].updateTime = nowTime
				}
				uni.setStorage({
					key: `${currentUserID}_frequentContacts`,
					data: cacheData
				})
			},

			// action
			cancelQuote() {
				this.$store.commit('message/SET_QUOTE_MESSAGE', undefined)
			},
			onClickActionBarOutside() {
				if (this.actionBarVisible) {
					this.actionBarVisible = false
				}
			},
			onClickEmojiBarOutside() {
				if (this.emojiBarVisible) {
					this.emojiBarVisible = false
				}
			},
			updateActionBar() {
				this.onClickEmojiBarOutside()
				this.actionBarVisible = !this.actionBarVisible
			},
			updateEmojiBar() {
				this.onClickActionBarOutside()
				this.emojiBarVisible = !this.emojiBarVisible
			},
			editorReady(e) {
				this.customEditorCtx = e.context;
				this.customEditorCtx.clear();
			},
			editorFocus() {
				this.isInputFocus = true
			},
			editorBlur() {
				this.isInputFocus = false
			},
			editorInput(e) {
				const newText = html2Text(e.detail.html)
				if (this.$store.getters.storeCurrentConversation.groupID && this.oldText.length < newText.length && newText
					.endsWith('@')) {
					uni.$u.route('/pages/conversation/groupMemberList/index', {
						type: GroupMemberListTypes.ChooseAt,
						groupID: this.$store.getters.storeCurrentConversation.groupID
					})
				}
				this.inputHtml = e.detail.html
				this.oldText = newText
				uni.$u.throttle(this.updateTyping, 2000)
			},
			backspace() {
				this.customEditorCtx.undo();
			},
			updateRecordBtn() {
				if (!this.showRecord) {
					this.checkRecordPermission()
				}
				this.showRecord = !this.showRecord
			},
			async checkRecordPermission() {
				if (uni.$u.os() === 'ios') {
					const iosFlag = judgeIosPermission('record')
					if (iosFlag === 0) {
						uni.$u.toast('您已禁止访问麦克风，请前往开启')
						setTimeout(() => gotoAppPermissionSetting(), 250)
					}
					if (iosFlag === -1) {
						let recorderManager = uni.getRecorderManager()
						recorderManager.onStop(() => recorderManager = null)
						recorderManager.start();
						setTimeout(() => recorderManager.stop());
					}
				} else {
					const androidFlag = await requestAndroidPermission('android.permission.RECORD_AUDIO')
					if (androidFlag === -1) {
						uni.$u.toast('您已禁止访问麦克风，请前往开启')
						setTimeout(() => gotoAppPermissionSetting(), 250)
					}
				}
			},
			prepareMediaMessage(type) {
				if (type === ChatingFooterActionTypes.Album) {
					this.actionSheetMenu = [...albumChoose]
				} else {
					this.actionSheetMenu = [...cameraChoose]
				}
				this.showActionSheet = true;
			},
			updateTyping() {
				if (this.storeCurrentConversation.conversationType === SessionType.Single) {
					IMSDK.compatibleAPI(IMSDK.IMMethods.TypingStatusUpdate, IMSDK.uuidv4(), this
						.storeCurrentConversation
						.userID, 'yes')
				}
			},

			// from comp
			emojiClick(emoji) {
				const options = {
					src: emoji.src,
					width: "24px",
					height: "18px",
					data: {
						emojiText: emoji.context
					},
					extClass: 'emoji_el'
				}
				this.$refs.customEditor.insertImage(options);
			},
			batchCreateImageMesage(paths) {
				paths.forEach(path => {
					const message = IMSDK.IMApi.createImageMessageFromFullPath(IMSDK.uuidv4(),
						getPurePath(
							path));
					console.log(path);
					console.log(message);
					this.sendMessage(message)
				})
			},
			receiveSnapBase64({
				base64,
				path,
				duration,
				videoType
			}) {
				base64ToPath(base64).then(snapRelativePath => {
					const absolutePath = plus.io.convertLocalFileSystemURL(snapRelativePath);
					const message = IMSDK.IMApi.createVideoMessageFromFullPath(IMSDK.uuidv4(),
						getPurePath(
							path),
						videoType,
						Number(duration.toFixed()), absolutePath);
					this.sendMessage(message)
				})

			},
			selectClick({
				idx
			}) {
				if (idx === 0) {
					if (this.actionSheetMenu[0].type === ChatingFooterActionTypes.Album) {
						this.chooseOrShotImage(['album'])
							.then(paths => this.batchCreateImageMesage(paths))
					} else {
						this.chooseOrShotImage(['camera'])
							.then(paths => this.batchCreateImageMesage(paths))
					}
				} else {
					const whenGetFile = data => {
						if (uni.$u.os() === 'ios') {
							const purePath = getPurePath(
								data.path)
							IMSDK.filePicker.getVideoAttributes(purePath, ({
								path
							}) => {
								console.log(getPurePath(path));
								const message = IMSDK.IMApi.createVideoMessageFromFullPath(IMSDK
									.uuidv4(),
									purePath,
									data.videoType,
									Number(data.duration.toFixed()), getPurePath(path));
								this.sendMessage(message)
							})
						} else {
							this.snapFlag = data
						}
					}
					if (this.actionSheetMenu[0].type === ChatingFooterActionTypes.Album) {
						this.chooseOrShotVideo(['album'])
							.then(whenGetFile)
					} else {
						this.chooseOrShotVideo(['camera'])
							.then(whenGetFile)
					}
				}
			},
			chooseOrShotImage(sourceType) {
				return new Promise((resolve, reject) => {
					uni.chooseImage({
						count: 9,
						sizeType: ['compressed'],
						sourceType,
						success: function({
							tempFilePaths
						}) {
							resolve(tempFilePaths)
						},
						fail: function(err) {
							console.log(err);
							reject(err)
						}
					})
				})
			},
			chooseOrShotVideo(sourceType) {
				return new Promise((resolve, reject) => {
					uni.chooseVideo({
						compressed: true,
						sourceType,
						extension: ['mp4'],
						success: function({
							tempFilePath,
							duration
						}) {
							const idx = tempFilePath.lastIndexOf('.')
							const videoType = tempFilePath.slice(idx + 1)
							if (tempFilePath.includes('_doc/')) {
								tempFilePath =
									`file://${plus.io.convertLocalFileSystemURL(tempFilePath)}`
							}
							console.log(tempFilePath);
							resolve({
								path: tempFilePath,
								videoType,
								duration
							})
						},
						fail: function(err) {
							console.log(err);
							reject(err)
						}
					})
				})
			},
			insertAt(userID, username) {
				console.log(userID, username);
				const {
					atUserList
				} = formatInputHtml(this.inputHtml)
				console.log(atUserList);
				if (atUserList.find(item => item.atUserID === userID)) {
					return;
				}
				this.$refs.customEditor.createCanvasData(userID, username)
			},

			// message status
			sendSuccessHandler({
				message
			}) {
				const successMessage = JSON.parse(message)
				this.updateOneMessage({
					message: successMessage,
					isSuccess: true
				})
			},
			sendFailedHandler({
				message,
				errCode,
				errMsg
			}) {
				console.log(errCode, errMsg);
				const failedMessage = JSON.parse(message)
				this.updateOneMessage({
					message: failedMessage,
					type: UpdateMessageTypes.KeyWords,
					keyWords: [{
							key: 'status',
							value: MessageStatus.Failed
						},
						{
							key: 'errCode',
							value: errCode
						}
					]
				})
			},
			sendProgressHandler({
				message,
				progress
			}) {
				const progressMessage = JSON.parse(message)
				this.updateOneMessage({
					message: progressMessage,
					type: UpdateMessageTypes.KeyWords,
					keyWords: {
						key: 'uploadProgress',
						value: progress
					}
				})
			},
			setSendMessageListener() {
				IMSDK.subscribe(IMSDK.IMEvents.SendMessageSuccess, this.sendSuccessHandler)
				IMSDK.subscribe(IMSDK.IMEvents.SendMessageFailed, this.sendFailedHandler)
				IMSDK.subscribe(IMSDK.IMEvents.SendMessageProgress, this.sendProgressHandler)
			},
			disposeSendMessageListener() {
				IMSDK.unsubscribe(IMSDK.IMEvents.SendMessageSuccess, this.sendSuccessHandler)
				IMSDK.unsubscribe(IMSDK.IMEvents.SendMessageFailed, this.sendFailedHandler)
				IMSDK.unsubscribe(IMSDK.IMEvents.SendMessageProgress, this.sendProgressHandler)
			},

			// keyboard
			keyboardChangeHander({
				height
			}) {
				if (height > 0) {
					if (this.emojiBarVisible) {
						this.emojiBarVisible = false
					}
					if (this.actionBarVisible) {
						this.actionBarVisible = false
					}
				}
			},
			setKeyboardListener() {
				uni.onKeyboardHeightChange(this.keyboardChangeHander)
			},
			disposeKeyboardListener() {
				uni.offKeyboardHeightChange(this.keyboardChangeHander)
			}
		}
	}
</script>


<script module="snap" lang="renderjs">
	export default {
		methods: {
			getSnapFlagUpdate(newValue, oldValue, ownerVm, vm) {
				if (newValue === null) {
					return;
				}
				const {
					path
				} = newValue
				this.getVideoSnshot(path).then(base64 => {
					ownerVm.callMethod('receiveSnapBase64', {
						...newValue,
						base64
					})
				})
			},
			getVideoSnshot(item) {
				return new Promise((reslove, reject) => {
					var video = document.createElement("VIDEO");
					video.style.display = 'none';
					video.setAttribute('crossOrigin', 'anonymous');
					video.setAttribute("autoplay", "autoplay");
					video.setAttribute("muted", "muted");
					video.innerHTML = "<source src=" + item + ' type="audio/mp4">';
					var canvas = document.createElement("canvas");
					var ctx = canvas.getContext("2d");
					video.addEventListener("canplay", function() {
						var anw = document.createAttribute("width");
						anw.nodeValue = video.videoWidth;
						var anh = document.createAttribute("height");
						anh.nodeValue = video.videoHeight;
						canvas.setAttributeNode(anw);
						canvas.setAttributeNode(anh);
						ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
						var base64 = canvas.toDataURL("image/png");
						video.pause();
						reslove(base64);
					});
				});
			},
		},
	}
</script>

<style lang="scss" scoped>
	.custom_editor {
		img {
			vertical-align: sub;
		}
	}

	.chat_footer {
		display: flex;
		align-items: center;
		background-color: #e9f4ff;
		// height: 50px;
		max-height: 120px;
		padding: 24rpx 20rpx;

		.input_content {
			flex: 1;
			min-height: 30px;
			max-height: 120px;
			margin: 0 24rpx;
			border-radius: 8rpx;
			position: relative;

			.record_btn {
				background-color: #3c9cff;
				height: 30px;
				font-size: 24rpx;
			}
		}

		.quote_message {
			@include vCenterBox();
			justify-content: space-between;
			margin-top: 12rpx;
			padding: 8rpx;
			// padding-top: 20rpx;
			border-radius: 6rpx;
			background-color: #fff;
			color: #666;

			.content {
				/deep/ uni-view {
					@include ellipsisWithLine(2);
				}
			}

		}

		.footer_action_area {
			display: flex;
			align-items: center;

			.emoji_action {
				margin-right: 24rpx;
			}

			image {
				width: 26px;
				height: 26px;
			}
		}

		.send_btn {
			height: 30px;
			line-height: 30px;
			background-color: #4a9cfc;
			padding: 0 8px;
			border-radius: 4px;
			color: #fff;
		}
	}
</style>