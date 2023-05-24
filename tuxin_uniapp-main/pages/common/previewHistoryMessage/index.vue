<template>
	<view class="page_container">
		<custom-nav-bar :title="conversationData.showName" />

		<scroll-view id="scroll_view" :style="{height:`1px`}" :scroll-top="scrollTop" scroll-y
			:scroll-into-view="scrollIntoView" upper-threshold="250" @scrolltoupper="fetchTopMessage"
			@scrolltolower="fetchBottomMessage">
			<view id="scroll_wrap">
				<u-loadmore nomoreText="" :status="topLoadMoreStatus" />
				<message-item-render v-for="(item,index) in chatLogs" :key="item.clientMsgID"
					:isActive="item.clientMsgID === jumpMessage.clientMsgID" isPreview :source="item"
					:preMessage="chatLogs[index-1]" :isSender="item.sendID === storeCurrentUserID"
					@messageItemRender="messageItemRender" />
			</view>
		</scroll-view>
		<u-loading-page :loading="initLoading"></u-loading-page>
	</view>

</template>

<script>
	import IMSDK from '@/util/compatibleIM'
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	import MessageItemRender from '@/pages/conversation/chating/components/MessageItem/index.vue'
	import {
		mapGetters,
	} from "vuex";

	export default {
		name: "",
		components: {
			CustomNavBar,
			MessageItemRender
		},
		data() {
			return {
				conversationData: {},
				jumpMessage: {},
				chatLogs: [],
				scrollTop: 0,
				scrollIntoView: '',
				initLoading: true,
				lastMinSeq: 0,
				topHasMore: true,
				topLoading: false,
				bottomHasMore: true,
				bottomLoading: false
			};
		},
		computed: {
			...mapGetters(['storeCurrentUserID']),
			topLoadMoreStatus() {
				if (!this.topHasMore) {
					return 'nomore'
				}
				return this.topLoading ? 'loading' : 'loadmore'
			},
			bottomLoadMoreStatus() {
				if (!this.bottomHasMore) {
					return 'nomore'
				}
				return this.bottomLoading ? 'loading' : 'loadmore'
			},
		},
		onLoad(options) {
			if (options.conversationData) {
				this.conversationData = JSON.parse(options.conversationData)
			}
			if (options.jumpMessage) {
				this.jumpMessage = JSON.parse(options.jumpMessage)
			}
			this.initMessageData();
		},
		methods: {
			messageItemRender(clientMsgID) {
				if (clientMsgID === this.jumpMessage.clientMsgID) {
					console.log(clientMsgID);
					this.$nextTick(() => {
						this.scrollIntoView = `auchor${this.jumpMessage.clientMsgID}`;
						this.initLoading = false
					})
				}
			},
			initMessageData() {
				const options = {
					conversationID: this.conversationData.conversationID,
					userID: "",
					groupID: "",
					count: 20,
					startClientMsgID: this.jumpMessage.clientMsgID,
					lastMinSeq: this.jumpMessage.seq,
				}
				const promiseArr = [IMSDK.compatibleAPI(IMSDK.IMMethods.GetAdvancedHistoryMessageList, IMSDK.uuidv4(),
					options), IMSDK.compatibleAPI(IMSDK.IMMethods.GetHistoryMessageListReverse, IMSDK.uuidv4(),
					options)]
				Promise.all(promiseArr).then(res => {
					console.log(res);
					this.chatLogs = [...res[0].data.messageList, this.jumpMessage, ...res[1].data]
					this.topHasMore = res[0].data.messageList.length === 20
					this.bottomHasMore = res[1].data.length === 20
					this.lastMinSeq = res[0].data.lastMinSeq
				}).catch(() => this.initLoading = false)
			},
			fetchTopMessage() {
				if (this.topLoading || !this.topHasMore) {
					return
				}
				this.topLoading = true
				const options = {
					conversationID: this.conversationData.conversationID,
					userID: "",
					groupID: "",
					count: 20,
					startClientMsgID: this.chatLogs[0].clientMsgID,
					lastMinSeq: this.lastMinSeq,
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.GetAdvancedHistoryMessageList, IMSDK.uuidv4(), options)
					.then(({
						data
					}) => {
						this.chatLogs = [...data.messageList, ...this.chatLogs]
						this.topHasMore = data.messageList.length === 20
						this.lastMinSeq = data.lastMinSeq
					}).finally(() => this.topLoading = false)
			},
			fetchBottomMessage() {
				if (this.bottomLoading || !this.bottomHasMore) {
					return
				}
				this.bottomLoading = true
				const options = {
					conversationID: this.conversationData.conversationID,
					userID: "",
					groupID: "",
					count: 20,
					startClientMsgID: this.chatLogs[this.chatLogs.length - 1].clientMsgID,
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.GetHistoryMessageListReverse, IMSDK.uuidv4(), options)
					.then(({
						data
					}) => {
						this.chatLogs = [...this.chatLogs, ...data]
						this.bottomHasMore = data.length === 20
					}).finally(() => this.bottomLoading = false)
			},
		}
	}
</script>

<style lang="scss" scoped>
	.page_container {

		#scroll_view {
			flex: 1;
		}
	}
</style>
