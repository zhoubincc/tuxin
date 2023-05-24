<template>
	<view class="search_container">
		<view class="search_bar_wrap">
			<u-search class="search_bar" shape="square" placeholder="搜索" v-model="keyword" actionText="取消"
				@custom="cancelSearch" @change="keywordChange" />
		</view>

		<search-description v-if="!keyword" />

		<u-list @scrolltolower="scrolltolower" lowerThreshold="100" v-if="searchResult.length > 0 && keyword"
			class="search_list" height="1">
			<u-list-item v-for="message in searchResult" :key="message.clientMsgID">
				<nomal-message-item :source="message" @click="jumpToMessage" />
			</u-list-item>
		</u-list>

		<view v-if="searchResult.length === 0 && keyword" class="search_empty">
			<view>
				<text>没有找到</text>
				<text class="high_light">{{`"${keyword}"`}}</text>
				<text>相关结果</text>
			</view>
		</view>


	</view>
</template>

<script>
	import IMSDK from '@/util/compatibleIM'
	import SearchDescription from "./components/SearchDescription.vue"
	import NomalMessageItem from "./components/NomalMessageItem.vue"

	export default {
		components: {
			SearchDescription,
			NomalMessageItem
		},
		data() {
			return {
				keyword: "",
				searchResult: [],
				loadState: {
					loading: false,
					hasMore: true,
					pageIndex: 1
				}
			}
		},
		mounted() {

		},
		methods: {
			cancelSearch() {
				uni.navigateBack()
			},
			scrolltolower() {
				if (this.loadState.hasMore && !this.loadState.loading) {
					this.loadSearchData();
				}
			},
			keywordChange(value) {
				uni.$u.debounce(() => {
					this.loadState.pageIndex = 1;
					this.searchResult = [];
					this.loadSearchData();
				})
			},
			loadSearchData() {
				if (!this.keyword) return;

				this.loadState.loading = true
				const options = {
					conversationID: this.$store.getters.storeCurrentConversation.conversationID,
					keywordList: [this.keyword],
					keywordListMatchType: 0,
					senderUserIDList: [],
					messageTypeList: [],
					searchTimePosition: 0,
					searchTimePeriod: 0,
					pageIndex: this.loadState.pageIndex,
					count: 20,
				};
				IMSDK.compatibleAPI(IMSDK.IMMethods.SearchLocalMessages, IMSDK.uuidv4(), options)
					.then(({
						data
					}) => {
						const searchData = data.searchResultItems ? data.searchResultItems[0].messageList : [];
						if (this.loadState.pageIndex === 1) {
							this.searchResult = [...searchData]
						} else {
							this.searchResult = [...this.searchResult, ...searchData]
						}
						console.log(this.searchResult);
						this.loadState.pageIndex += 1;
						this.loadState.hasMore = searchData.length === 20
					}).catch(() => uni.$u.toast('搜索失败')).finally(() => this.loadState.loading = false)
			},
			jumpToMessage(message) {
				uni.$u.route('/pages/common/previewHistoryMessage/index',{
					conversationData: JSON.stringify({...this.$store.getters.storeCurrentConversation}),
					jumpMessage: JSON.stringify(message)
				})
			}

		}
	}
</script>

<style lang="scss" scoped>
	.search_container {
		@include colBox(false);
		height: 100vh;
		overflow: hidden;

		.search_bar_wrap {
			margin-top: var(--status-bar-height);
			padding: 44rpx;

			/deep/.u-search__action {
				color: $uni-color-primary;
			}
		}

		.search_empty {
			text-align: center;
			margin-top: 96rpx;
			color: #666;

			.high_light {
				color: $uni-color-primary;
			}
		}

		.search_list {
			flex: 1;
		}

	}
</style>
