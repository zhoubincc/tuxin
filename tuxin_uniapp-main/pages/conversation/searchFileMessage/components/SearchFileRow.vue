<template>
	<view class="search_data_row">
		<text class="row_title">{{getTitle}}</text>
		<view class="row_list">
			<search-file-item v-for="message in source" :message="message" :key="message.clientMsgID" />
		</view>
	</view>
</template>

<script>
	import SearchFileItem from './SearchFileItem.vue'
	export default {
		name: "",
		components: {
			SearchFileItem
		},
		props: {
			source: Array,
			idx: Number,
		},
		data() {
			return {

			};
		},
		computed: {
			getTitle() {
				switch (this.idx) {
					case 0:
						return '本周'
					case 1:
						return '本月'
					case 2:
						return '更久'
					default:
						return '更久'
				}
			},
		}
	}
</script>

<style lang="scss" scoped>
	.search_data_row {
		margin-top: 12rpx;

		.row_title {
			margin-left: 44rpx;
			margin-bottom: 12rpx;
			color: #666;
		}

		.row_list {}
	}
</style>
