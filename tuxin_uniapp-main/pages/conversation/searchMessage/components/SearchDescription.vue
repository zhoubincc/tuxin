<template>
	<view class="search_desc">
		<view class="search_desc_title">
			搜索指定内容
		</view>
		<view class="search_desc_list">
			<view @click="toSearchMedia(false)" class="search_desc_item">
				<text>图片</text>
			</view>
			<view @click="toSearchMedia(true)" class="search_desc_item">
				<text>视频</text>
			</view>
			<view @click="toSearchFile" class="search_desc_item">
				<text>文件</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: "",
		components: {},
		props: {},
		data() {
			return {

			};
		},
		methods: {
			toSearchMedia(isVideo) {
				uni.navigateTo({
					url: `/pages/conversation/searchMediaMessage/index?isVideo=${isVideo}`
				})
			},
			toSearchFile() {
				uni.navigateTo({
					url: '/pages/conversation/searchFileMessage/index'
				})
			}
		}
	}
</script>

<style lang="scss">
	.search_desc {
		margin-top: 48rpx;

		&_title {
			text-align: center;
			font-size: 28rpx;
			color: #666;
			margin-bottom: 24rpx;
		}

		&_list {
			display: flex;
			justify-content: space-around;
		}

		&_item {
			padding: 24rpx;
			color: $uni-color-primary;
		}
	}
</style>
