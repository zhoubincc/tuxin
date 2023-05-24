<template>
	<view @click="toPreviewFile" class="file_item">
		<view class="top_info">
			<view class="sender">
				<my-avatar :src="message.senderFaceURL" :desc="message.senderNickname" />
				<text class="sender_name">{{message.senderNickname}}</text>
			</view>
			<text class="timer">{{getSendTime}}</text>
		</view>
		<view class="file_info">
			<image src="@/static/images/file_icon_zip.png" alt="">
			<view class="file_desc">
				<text>{{message.fileElem.fileName}}</text>
				<text>{{getSize}}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import MyAvatar from '@/components/MyAvatar/index.vue'
	import {
		bytesToSize,
		formatConversionTime
	} from '@/util/imCommon';
	export default {
		name: "",
		components: {
			MyAvatar
		},
		props: {
			message: Object
		},
		data() {
			return {

			};
		},
		computed: {
			getSendTime() {
				return formatConversionTime(this.message.sendTime)
			},
			getSize() {
				return bytesToSize(this.message.fileElem.fileSize)
			}
		},
		methods: {
			toPreviewFile(){
				uni.$u.route("/pages/conversation/previewFile/index", {
					fileEl: JSON.stringify(this.message.fileElem),
					msgID: this.message.clientMsgID
				});
			}
		}
	}
</script>

<style lang="scss" scoped>
	.file_item {
		@include colBox(false);
		padding: 32rpx 44rpx;
		background-color: #fff;
		color: $uni-text-color;
		margin-bottom: 12rpx;

		.top_info {
			@include btwBox();
			font-size: 28rpx;

			.timer {
				color: #999;
			}
		}

		.sender {
			@include vCenterBox();

			&_name {
				@include nomalEllipsis();
				max-width: 480rpx;
				margin-left: 24rpx;
			}
		}

		.file_info {
			@include vCenterBox();
			margin-top: 36rpx;
			font-size: 28rpx;

			.file_desc {
				@include colBox(false);
				margin-left: 24rpx;

				text {
					@include nomalEllipsis();
					max-width: 480rpx;

					&:last-child {
						color: #999;
						margin-top: 12rpx;
					}
				}
			}
			
			image {
				width: 40px;
				height: 38px;
			}
		}
	}
</style>
