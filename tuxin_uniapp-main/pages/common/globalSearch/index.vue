<template>
	<view class="page_container">
		<view class="search_bar_wrap">
			<u-search shape="square" placeholder="搜索" v-model="keyword" actionText="取消" @search="enterSearch" @custom="back" />
		</view>

		<u-tabs class="top_tab" lineColor='#1B72EC' :activeStyle="{color:'#1B72EC'}" :inactiveStyle="{color:'#ADADAD'}"
			:scrollable="false" :list="tabList" :current="currentTab" @click="clickTab"></u-tabs>

		<comprehensive-panel v-show="currentTab === 0" :data="dataSource" @toggleTab="clickTab" />

		<generic-panel v-show="currentTab > 0 && genericDataSource.length > 0" :generic-list="genericDataSource" @scrolltolower="scrolltolower" />

		<u-empty v-show="currentTab > 0 && genericDataSource.length === 0" mode="search" />
	</view>
</template>

<script>
	import IMSDK from '@/util/compatibleIM'
	import ComprehensivePanel from './components/ComprehensivePanel.vue'
	import GenericPanel from './components/GenericPanel.vue'
	import {
		MessageType
	} from '@/constant'
	import { parseMessageByType } from '@/util/imCommon'
	
	export default {
		components: {
			ComprehensivePanel,
			GenericPanel
		},
		data() {
			return {
				currentTab: 0,
				keyword: "",
				tabList: [{
						name: '综合'
					},
					{
						name: '联系人'
					},
					{
						name: '群组'
					},
					{
						name: '聊天记录'
					},
					{
						name: '文档'
					},
				],
				dataSource: {
					contacts: [],
					groups: [],
					chatLogs: [],
					documents: [],
				},
				documentsPageIndex: 1,
				documentsHasMore: true,
				documentsLoading: false,
			};
		},
		computed: {
			genericDataSource() {
				switch (this.currentTab){
					case 1:
						return this.dataSource.contacts
					case 2:
						return this.dataSource.groups
					case 3:
						return this.dataSource.chatLogs
					case 4:
						return this.dataSource.documents
					default:
						return []
				}
			}
		},
		methods: {
			clickTab({
				index
			}) {
				this.currentTab = index
			},
			back(){
				uni.navigateBack()
			},
			enterSearch() {
				if(!this.keyword) return;
				
				this.documentsPageIndex = 1
				this.documentsHasMore = true
				this.searchUser();
				this.searchGroup();
				this.searchChatLogs();
				this.searchFileLogs()
			},
			scrolltolower() {
				if (this.currentTab !== 4 || this.documentsLoading || !this.documentsHasMore) {
					return
				}
				this.searchFileLogs()
			},
			searchUser() {
				const options = {
					keywordList: [this.keyword],
					isSearchUserID: false,
					isSearchNickname: true,
					isSearchRemark: true,
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.SearchFriends,IMSDK.uuidv4(),options)
				.then(({data}) => {
					this.dataSource.contacts = data
				})
			},
			searchGroup() {
				const options = {
					keywordList: [this.keyword],
					isSearchGroupID: false,
					isSearchGroupName: true
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.SearchGroups, IMSDK.uuidv4(), options)
					.then(({data}) => {
						this.dataSource.groups = data
					})
			},
			searchChatLogs() {
				const options = {
					conversationID: "",
					keywordList: [this.keyword],
					keywordListMatchType: 0,
					senderUserIDList: [],
					messageTypeList: [],
					searchTimePosition: 0,
					searchTimePeriod: 0,
					pageIndex: 0,
					count: 0,
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.SearchLocalMessages, IMSDK.uuidv4(), options)
					.then(({
						data
					}) => {
						const searchData = data.searchResultItems ?? []
						searchData.map(item => {
							item.groupID = item.messageList[0].groupID
							item.sendTime = item.messageList[0].sendTime
							item.latestMsg = item.messageCount > 1 ? `${item.messageCount}条相关聊天记录` : parseMessageByType(item.messageList[0])
						})
						this.dataSource.chatLogs = [...searchData]
					})
			},
			searchFileLogs() {
				const options = {
					conversationID: "",
					keywordList: [this.keyword],
					keywordListMatchType: 0,
					senderUserIDList: [],
					messageTypeList: [MessageType.FILEMESSAGE],
					searchTimePosition: 0,
					searchTimePeriod: 0,
					pageIndex: this.documentsPageIndex,
					count: 20,
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.SearchLocalMessages, IMSDK.uuidv4(), options)
					.then(({
						data
					}) => {
						const searchData = data.searchResultItems ? data.searchResultItems[0].messageList : [];
						this.dataSource.documents = [...this.documents, ...searchData]
						this.documentsHasMore = searchData.length === 20
						this.documentsPageIndex += 1
					})
			},
		}
	}
</script>

<style lang="scss">
	.page_container {
		background-color: #F8F8F8;
		overflow: hidden;
		margin-top: var(--status-bar-height);

		.search_bar_wrap {
			height: 34px;
			padding: 12px 22px 0;
			background-color: #fff;
		}

		.u-tabs {
			background-color: #fff;
			border-bottom: 1px solid #EAEAEA;

			/deep/ .u-tabs__wrapper__nav__item__text {
				word-break: keep-all;
			}

			/deep/ .u-tabs__wrapper__nav__line {
				bottom: 0;
			}
		}

		.u-empty {
			margin-top: 20vh !important;
		}
	}
</style>
