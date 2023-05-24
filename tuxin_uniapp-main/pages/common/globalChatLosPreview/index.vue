<template>
	<view class="page_container">
		<view class="search_bar_wrap">
			<u-search shape="square" placeholder="搜索" v-model="keyword" actionText="取消" @custom="back" />
		</view>
		
		<view class="desc_row">
			{{ `${chatData.messageList.length}条相关的聊天记录` }}
		</view>

		<u-list class="generic_list" height="1">
			<u-list-item v-for="item in chatData.messageList" :key="item.clientMsgID">
				<global-result-item isPreview :item="item" @click="jumpToMessage(item)" />
			</u-list-item>
		</u-list>
	</view>

</template>

<script>
	import GlobalResultItem from '../globalSearch/components/GlobalResultItem.vue'

	export default {
		name: "",
		components: {
			GlobalResultItem
		},
		data() {
			return {
				chatData: [],
				keyword: ''
			};
		},
		onLoad(options) {
			if (options.chatData) {
				this.chatData = JSON.parse(options.chatData)
			}
		},
		methods: {
			back() {
				uni.navigateBack()
			},
			jumpToMessage(message) {
				uni.$u.route('/pages/common/previewHistoryMessage/index',{
					conversationData: JSON.stringify({...this.chatData,messageList:undefined}),
					jumpMessage: JSON.stringify(message)
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page_container {
		background-color: #F8F8F8;
		overflow-x: hidden;
		margin-top: var(--status-bar-height);

		.search_bar_wrap {
			height: 68rpx;
			padding: 24rpx 44rpx 0;
			background-color: #fff;
		}
		
		.desc_row {
			font-size: 24rpx;
			color: #ADADAD;
			padding: 24rpx 44rpx;
			background-color: #fff;
			border-bottom: 1px solid #EAEAEA;
		}

		.generic_list {
			flex: 1;
		}
	}
</style>
