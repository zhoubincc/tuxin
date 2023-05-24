<template>
	<page-meta :root-font-size="$store.getters.storeRootFontSize"></page-meta>
	<view :style="{backgroundColor:'#f8f8f8'}" class="chating_container">
		<chating-header @click="pageClick" ref="chatingHeaderRef" />
		<chating-list @click="pageClick" :mutipleCheckVisible="mutipleCheckVisible" ref="chatingListRef"
			@initSuccess="initSuccess" :menuOutsideFlag="menuOutsideFlag" />
		<chating-footer v-show="!mutipleCheckVisible" ref="chatingFooterRef" :footerOutsideFlag="footerOutsideFlag"
			@scrollToBottom="scrollToBottom" />
		<view v-show="mutipleCheckVisible" class="mutiple_action_container">
			<view @click="mutipleRemove" class="action_item">
				<u-icon name="trash" size="24"></u-icon>
				<text>
					删除
				</text>
			</view>
			<view @click="mutipleForward" class="action_item">
				<u-icon name="share-square" size="24"></u-icon>
				<text>
					合并转发
				</text>
			</view>
		</view>
		<u-loading-page :loading="initLoading"></u-loading-page>
	</view>
</template>

<script>
	import {
		mapGetters,
		mapActions
	} from "vuex";
	import IMSDK from '@/util/compatibleIM'
	import {
		ContactChooseTypes,
		GroupMemberListTypes,
		PageEvents
	} from '@/constant'
	import ChatingHeader from './components/ChatingHeader.vue'
	import ChatingFooter from './components/ChatingFooter/index.vue'
	import ChatingList from './components/ChatingList.vue'
	import {
		markConversationAsRead,
		parseMessageByType
	} from "@/util/imCommon";

	export default {
		components: {
			ChatingHeader,
			ChatingFooter,
			ChatingList,
		},
		data() {
			return {
				listHeight: 0,
				footerOutsideFlag: 0,
				menuOutsideFlag: 0,
				initLoading: true,
				mutipleCheckVisible: false,
				back2Tab: false,
				timer: null,
			}
		},
		onLoad(options) {
			console.log('onload');
			this.setPageListener();
			this.checkCalling();
			if (options?.back2Tab) {
				this.back2Tab = JSON.parse(options.back2Tab)
			}
		},
		onUnload() {
			console.log('unload');
			this.disposePageListener();
			markConversationAsRead({
				...this.$store.getters.storeCurrentConversation
			}, true);
			this.resetConversationState();
			this.resetMessageState();
			if(this.timer){
				clearInterval(this.timer)
			}
		},
		methods: {
			...mapActions('message', ['resetMessageState', 'deleteMessages']),
			...mapActions('conversation', ['resetConversationState']),
			scrollToBottom(isRecv = false) {
				// this.$refs.chatingListRef.scrollToAnchor(`auchor${clientMsgID}`, isRecv);
				this.$refs.chatingListRef.scrollToBottom(false, isRecv);
			},
			nativeCallEndHandler() {
				if(!this.$store.getters.storeCurrentConversation.groupID){
					return;
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.SignalingGetRoomByGroupID,IMSDK.uuidv4(),this.$store.getters.storeCurrentConversation.groupID)
				.then(({data})=>{
					if(data.invitation){
						this.$refs.chatingHeaderRef.updateCallingData(data)
					}else {
						this.$refs.chatingHeaderRef.updateCallingData(null)
					}
				})
			},
			checkCalling() {
				if(!this.$store.getters.storeCurrentConversation.groupID){
					return;
				}
				
				if(this.timer){
					clearInterval(this.timer)
				}
				this.nativeCallEndHandler();
				this.timer = setInterval(this.nativeCallEndHandler,10000)
			},
			mutipleRemove() {
				const checkedMessages = this.$store.getters.storeHistoryMessageList.filter(message => message.checked)
				if (checkedMessages.length === 0) {
					uni.$u.toast('请先选择要操作的消息')
					return;
				}
				let count = 0
				checkedMessages.map(message => {
					IMSDK.compatibleAPI(IMSDK.IMMethods.DeleteMessageFromLocalAndSvr, IMSDK.uuidv4(), message)
						.then(() => {
							count++;
							if (count === checkedMessages.length) {
								this.deleteMessages(checkedMessages)
								this.mutipleCheckUpdateHandler(false)
								uni.$u.toast('删除成功')
							}
						})
				})
			},
			mutipleForward() {
				const checkedMessages = this.$store.getters.storeHistoryMessageList.filter(message => message.checked)
				if (checkedMessages.length === 0) {
					uni.$u.toast('请先选择要操作的消息')
					return;
				}

				const currentConversation = this.$store.getters.storeCurrentConversation
				const title = currentConversation.groupID ? `群聊${currentConversation.showName}的聊天记录` :
					`和${currentConversation.showName}的聊天记录`

				const mergeInfo = {
					messageList: [...checkedMessages],
					summaryList: checkedMessages.map(message =>
						`${message.senderNickname}: ${parseMessageByType(message)}`),
					title
				}
				uni.navigateTo({
					url: `/pages/common/contactChoose/index?type=${ContactChooseTypes.MergeForWard}&mergeInfo=${JSON.stringify(mergeInfo)}`
				})
			},
			async pageClick(e) {
				this.getEl('.message_menu_container').then(res => {
					if (res) {
						this.menuOutsideFlag += 1;
					}
				})

				this.footerOutsideFlag += 1
			},
			getEl(el) {
				return new Promise((resolve) => {
					const query = uni.createSelectorQuery().in(this)
					query.select(el).boundingClientRect(data => {
						resolve(data)
					}).exec();
				})
			},
			initSuccess() {
				console.log('initSuccess');
				this.initLoading = false
			},
			async getCheckedUsers(data) {
				this.$refs.chatingFooterRef.customEditorCtx.undo();
				for (let i = 0; i < data.length; i++) {
					this.$refs.chatingFooterRef.insertAt(data[i].userID, data[i].nickname);
					await uni.$u.sleep(150);
				}
			},
			sendRtcInvite(mediaType, userIDList) {
				const isVideo = mediaType === 'video'
				const inviteeUserIDList = userIDList ?? [this.$store.getters.storeCurrentConversation.userID]
				IMSDK.callingModule.startLiveChat(isVideo,inviteeUserIDList,this.$store.getters.storeCurrentConversation.groupID,this.$store.getters.storeCurrentUserID)
			},
			chooseCallMediaType(mediaType) {
				return new Promise((resolve, reject) => {
					if (mediaType) {
						resolve(mediaType)
						return;
					}
					uni.showActionSheet({
						itemList: ['语音通话', '视频通话'],
						success: ({
							tapIndex
						}) => {
							resolve(tapIndex ? 'video' : 'audio')
						},
						fail: () => reject()
					})
				})
			},


			// page event
			typingHandler() {
				this.$refs.chatingHeaderRef.updateTyping();
			},
			onlineCheckHandler() {
				this.$refs.chatingHeaderRef.checkOnline();
			},
			atSomeOneHandler({
				userID,
				nickname
			}) {
				console.log('atSomeOneHandler');
				this.$refs.chatingFooterRef.insertAt(userID, nickname)
			},
			mutipleCheckUpdateHandler(flag) {
				this.mutipleCheckVisible = flag
				if (!flag) {
					const tmpMessageList = [...this.$store.getters.storeHistoryMessageList]
					tmpMessageList.map(message => message.checked = false)
					this.$store.commit('message/SET_HISTORY_MESSAGE_LIST', tmpMessageList)
				}
			},
			rtcInvitePrepare(mediaType) {
				this.chooseCallMediaType(mediaType)
					.then(callMediaType => {
						if (this.$store.getters.storeCurrentConversation.userID) {
							this.sendRtcInvite(callMediaType)
						} else {
							uni.$u.route('/pages/conversation/groupMemberList/index', {
								type: GroupMemberListTypes.CallInvite,
								groupID: this.$store.getters.storeCurrentConversation.groupID,
								callMediaType: callMediaType
							})
						}
					})
			},
			setPageListener() {
				uni.$on(PageEvents.TypingUpdate, this.typingHandler)
				uni.$on(PageEvents.OnlineStateCheck, this.onlineCheckHandler)
				uni.$on(PageEvents.ScrollToBottom, this.scrollToBottom)
				uni.$on(PageEvents.AtSomeOne, this.atSomeOneHandler)
				uni.$on(PageEvents.MutipleCheckUpdate, this.mutipleCheckUpdateHandler)
				uni.$on(PageEvents.RtcCall, this.rtcInvitePrepare)
				uni.$on(PageEvents.NativeCallEnd, this.nativeCallEndHandler)
			},
			disposePageListener() {
				uni.$off(PageEvents.TypingUpdate, this.typingHandler)
				uni.$off(PageEvents.OnlineStateCheck, this.onlineCheckHandler)
				uni.$off(PageEvents.ScrollToBottom, this.scrollToBottom)
				uni.$off(PageEvents.AtSomeOne, this.atSomeOneHandler)
				uni.$off(PageEvents.MutipleCheckUpdate, this.mutipleCheckUpdateHandler)
				uni.$off(PageEvents.RtcCall, this.rtcInvitePrepare)
				uni.$off(PageEvents.NativeCallEnd, this.nativeCallEndHandler)
			}
		},
		onBackPress(options) {
			// if (this.back2Tab && !this.mutipleCheckVisible) {
			if (!this.mutipleCheckVisible) {
				uni.switchTab({
					url: '/pages/conversation/conversationList/index'
				})
				return true
			}

			if (options.from === 'navigateBack') return false;

			if (this.mutipleCheckVisible) {
				this.mutipleCheckUpdateHandler(false)
			} else {
				uni.navigateBack()
			}

			return true
		}
	}
</script>

<style lang="scss" scoped>
	.chating_container {
		@include colBox(false);
		height: 100vh;
		overflow: hidden;
		background-color: #fff !important;

		.mutiple_action_container {
			display: flex;
			border-top: 1px solid #EAEAEA;

			.action_item {
				@include centerBox();
				flex-direction: column;
				flex: 1;
				padding: 48rpx 0;
				font-size: 24rpx;
				color: #898989;

				.u-icon {
					margin-bottom: 6rpx;
				}
			}
		}
	}
</style>
