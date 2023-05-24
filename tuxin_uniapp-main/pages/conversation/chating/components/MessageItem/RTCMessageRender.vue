<template>
	<view class="bg_container rtc_wrap" :class="{'rtc_wrap_self':isSender}" @click="reCall">
		<image :src="rtcIcon" />
		<view>
			{{messageCoontent}}
		</view>
	</view>
</template>

<script>
	import chating_message_video_other from '@/static/images/chating_message_video_other.png'
	import chating_message_video from '@/static/images/chating_message_video.png'
	import chating_message_voice from '@/static/images/chating_message_voice.png'
	import {
		CustomMessageStatus,
		CustomType,
		PageEvents,
		SessionType
	} from '@/constant';
	export default {
		name: 'RTCMessageRender',
		components: {

		},
		props: {
			data: Object,
			isSender: Boolean
		},
		data() {
			return {

			};
		},
		computed: {
			rtcIcon() {
				if (this.data.type === CustomType.VideoCall) {
					return this.isSender ? chating_message_video : chating_message_video_other
				}
				return chating_message_voice
			},
			messageCoontent() {
				switch (this.data.status) {
					case CustomMessageStatus.Success:
						return `通话时长 ${this.data.duration}`
					case CustomMessageStatus.AccessByOther:
						return '已在其它端处理'
					case CustomMessageStatus.Cancel:
						return '已取消'
					case CustomMessageStatus.Canceled:
						return '对方已取消'
					case CustomMessageStatus.Refuse:
						return '已拒绝'
					case CustomMessageStatus.Refused:
						return '对方已拒绝'
					case CustomMessageStatus.Timeout:
						return '超时未接听'
					default:
						return ''
				}
			}
		},
		methods: {
			reCall() {
				uni.$emit(PageEvents.RtcCall,this.data.type === CustomType.VideoCall ? 'video' : 'audio')
			}
		}
	}
</script>

<style lang="scss" scoped>
	.rtc_wrap {
		display: flex;
		align-items: center;
		
		image {
			width: 20px;
			height: 20px;
			margin-right: 12rpx;
		}
		
		&_self {
			flex-direction: row-reverse;
			
			image {
				margin-right: 0 !important;
				margin-left: 12rpx;
			}
		}
	}
</style>
