<template>
	<view @click="click" class="merge_item">
		<my-avatar :src="source.faceURL" :desc="source.senderNickname" size="42" />
		<view class="merge_details">
			<view class="top_desc">
				<text class="send_name">{{source.senderNickname}}</text>
				<text class="send_timer">{{getSendTime}}</text>
			</view>
			<view class="message_row">
				<text class="message_content">{{getContent}}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import MyAvatar from '@/components/MyAvatar/index.vue'
	import {
		formatConversionTime,
		parseEmoji,
		parseMessageByType
	} from '@/util/imCommon';
	export default {
		name: "",
		components: {
			MyAvatar
		},
		props: {
			source: Object
		},
		data() {
			return {

			};
		},
		computed: {
			getSendTime() {
				return formatConversionTime(this.source.sendTime)
			},
			getContent() {
				return parseEmoji(parseMessageByType(this.source))
			}
		},
		methods: {
			click(){
				this.$emit('click',this.source)
			}
		}
	}
</script>

<style lang="scss">
	.merge_item {
		display: flex;
		flex-direction: row;
		padding: 24rpx 44rpx;

		.merge_details {
			@include colBox(false); 
			margin-left: 24rpx;
			border-bottom: 1px solid #DFDFDF;
			width: 100%;
			padding-bottom: 24rpx;

			.top_desc {
				display: flex;
				justify-content: space-between;
				font-size: 28rpx;

				.send_name {
					@include nomalEllipsis();
					max-width: 240rpx;
					margin-bottom: 6rpx;
					color: $uni-text-color;
				}

				.send_timer {
					color: #999;
				}
			}

			.message_row {
				@include colBox(false);

				.message_content {
					@include ellipsisWithLine(5);
					font-size: 28rpx;
					color: #666;
				}

				.quote_content {
					width: fit-content;
					padding: 6rpx 12rpx;
					border-radius: 4rpx;
					background-color: #f0f0f0;
					margin-top: 12rpx;
				}
			}


		}
	}
</style>
