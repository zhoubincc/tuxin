<template>
	<view class="comprehensive_container">
		<view v-show="data.contacts.length>0" class="comprehensive_row">
			<view class="row_title">
				<text>联系人</text>
				<text v-show="data.contacts.length>3" class="more" @click="toggleTab(1)">查看更多</text>
			</view>
			<global-result-item v-for="user in data.contacts.slice(0,3)" :item="user" :key="user.userID" />
		</view>

		<view v-show="data.groups.length>0" class="comprehensive_row">
			<view class="row_title">
				<text>群组</text>
				<text v-show="data.groups.length>3" class="more" @click="toggleTab(2)">查看更多</text>
			</view>
			<global-result-item v-for="group in data.groups.slice(0,3)" :item="group" :key="group.groupID" />
		</view>

		<view v-show="data.chatLogs.length>0" class="comprehensive_row">
			<view class="row_title">
				<text>聊天记录</text>
				<text v-show="data.chatLogs.length>3" class="more" @click="toggleTab(3)">查看更多</text>
			</view>
			<global-result-item v-for="logs in data.chatLogs.slice(0,3)" :item="logs" :key="logs.conversationID" />
		</view>

		<view v-show="data.documents.length>0" class="comprehensive_row">
			<view class="row_title">
				<text>文件</text>
				<text v-show="data.documents.length>3" class="more" @click="toggleTab(4)">查看更多</text>
			</view>
			<global-result-item v-for="document in data.documents.slice(0,3)" :item="document" :key="document.clientMsgID" />
		</view>
		
		<u-empty v-show="isEmpty" mode="search" />
	</view>
</template>

<script>
	import IMSDK from '@/util/compatibleIM'
	import GlobalResultItem from './GlobalResultItem.vue'
	export default {
		components: {
			GlobalResultItem
		},
		props: {
			data: Object
		},
		data() {
			return {
			};
		},
		computed: {
			isEmpty() {
				return Object.values(this.data).find(item=>item.length>0) === undefined
			}
		},
		methods: {
			toggleTab(tab){
				this.$emit('toggleTab',{index:tab})
			}
		}
	}
</script>

<style lang="scss">
	.comprehensive_container {
		flex: 1;
		overflow-y: auto;

		.comprehensive_row {
			background-color: #fff;
			margin-bottom: 24rpx;

			.row_title {
				display: flex;
				justify-content: space-between;
				padding: 24rpx 44rpx 0;
				font-size: 24rpx;

				.more {
					color: #1B72EC;
				}
			}
		}
		
		.u-empty {
			margin-top: 20vh !important;
		}
	}
</style>
