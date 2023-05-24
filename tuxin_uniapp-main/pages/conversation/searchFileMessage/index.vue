<template>
	<view class="search_file_container">
		<custom-nav-bar title="文件" />
		
		<u-list v-if="!isEmpty" @scrolltolower="scrolltolower" lowerThreshold="100"
			class="search_data_container" height="1">
			<u-list-item v-for="(item,idx) in getRenderList" :key="idx">
				<search-file-row v-if="item.length>0" :source="item" :idx="idx" />
			</u-list-item>
		</u-list>
		<u-empty v-else mode="list" />
	</view>
</template>

<script>
	import {
		MessageType
	} from "@/constant"
	import IMSDK from '@/util/compatibleIM'
	import dayjs from "dayjs"
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	import SearchFileRow from './components/SearchFileRow.vue'
	export default {
		components: {
			CustomNavBar,
			SearchFileRow
		},
		data() {
			return {
				searchResult: {
					week: [],
					month: [],
					before: []
				},
				loadState: {
					loading: false,
					hasMore: true,
					pageIndex: 1
				}
			};
		},
		computed: {
			getRenderList() {
				return Object.values(this.searchResult)
			},
			isEmpty() {
				return this.getRenderList.flat().length === 0
			}
		},
		onLoad() {
			this.loadMediaData();
		},
		methods: {
			scrolltolower() {
				if (this.loadState.hasMore && !this.loadState.loading) {
					this.loadSearchData();
				}
			},
			loadMediaData() {
				this.loadState.loading = true
				const options = {
					conversationID: this.$store.getters.storeCurrentConversation.conversationID,
					keywordList: [],
					keywordListMatchType: 0,
					senderUserIDList: [],
					messageTypeList: [ MessageType.FILEMESSAGE],
					searchTimePosition: 0,
					searchTimePeriod: 0,
					pageIndex: this.loadState.pageIndex,
					count: 50,
				};
				IMSDK.compatibleAPI(IMSDK.IMMethods.SearchLocalMessages, IMSDK.uuidv4(), options)
					.then(({
						data
					}) => {
						const searchData = data.searchResultItems ? data.searchResultItems[0].messageList : [];
						let weekMessage = [];
						let monthMessage = [];
						let beforeMessage = [];
						searchData.map(message => {
							const time = message.sendTime;
							if (time > dayjs().subtract(1, 'week')) {
								weekMessage.push(message)
							} else if (time > dayjs().subtract(1, 'month')) {
								monthMessage.push(message)
							} else {
								beforeMessage.push(message)
							}
						})
						this.searchResult = {
							week: [...this.searchResult.week, ...weekMessage],
							month: [...this.searchResult.month, ...monthMessage],
							before: [...this.searchResult.before, ...beforeMessage]
						}
						console.log(this.searchResult);
						this.loadState.pageIndex += 1;
						this.loadState.hasMore = searchData.length === 50
					}).catch((e) => {
						console.log(e);
						uni.$u.toast('搜索失败')
					}).finally(() => this.loadState.loading = false)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.search_file_container {
		@include colBox(false);
		height: 100vh;
		background-color: #F6F6F6;

		.search_data_container {
			flex: 1
		}
		
		.u-empty {
			margin-top: 25vh !important;
		}
	}
</style>
