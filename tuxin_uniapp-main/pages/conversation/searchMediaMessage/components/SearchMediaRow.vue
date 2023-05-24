<template>
	<view class="search_data_row">
		<text class="row_title">{{getTitle}}</text>
		<u-row gutter="12" customStyle="flex-wrap:wrap;">
			<u-col v-for="item in source" :key="item.clientMsgID" span="3">
				<u--image height="94" width="100%" :showLoading="true" :src="getSrc(item)" @click='clickItem(item)'></u--image>
				<image v-if="isVideo" class="play_icon" src="@/static/images/chating_message_video_play.png" alt="" srcset="" @click.stop='clickItem(item)'/>
			</u-col>
		</u-row>
	</view>
</template>

<script>
	export default {
		name: "",
		components: {},
		props: {
			source: Array,
			idx: Number,
			isVideo: Boolean
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
			getSrc() {
				return (message) => {
					if (this.isVideo) {
						return message.videoElem.snapshotUrl;
					}
					return message.pictureElem.sourcePicture.url;
				}
			}
		},
		methods: {
			clickItem(message) {
				if (this.isVideo) {
					uni.navigateTo({
						url: `/pages/conversation/previewVideo/index?previewVideoUrl=${message.videoElem.videoUrl}`
					})
				} else {
					const list = this.source.map(message => message.pictureElem.sourcePicture.url);
					const idx = list.findIndex(item => item === this.getSrc)
					uni.previewImage({
						current: idx,
						urls: list,
						fail(err) {
							console.log(err);
						}
					})
				}
			}
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

		.u-row {
			margin-top: 16rpx;
		}

		.u-col {
			margin-bottom: 24rpx;
			position: relative;
			
			.play_icon {
				width: 24px;
				height: 24px;
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
			}
		}
	}
</style>
