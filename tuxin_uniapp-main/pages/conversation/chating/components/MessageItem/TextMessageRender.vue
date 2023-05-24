<template>
	<view class="text_message_container bg_container">
		<mp-html @linktap="navigate" :previewImg="false" :showImgMenu="false" :lazyLoad="false" :content="getContent" />
		<!-- <u-parse :imgOptions="false" @navigate="navigate" :content="getContent" /> -->
	</view>
</template>

<script>
	import {
		MessageType
	} from "@/constant"
	import {
		parseAt, parseEmoji
	} from "@/util/imCommon"

	export default {
		name: 'TextMessageRender',
		components: {
			
		},
		props: {
			message: Object
		},
		computed: {
			getContent() {
				let msgStr = this.message.content;
				if (this.message.contentType === MessageType.QUOTEMESSAGE) {
					msgStr = this.message.quoteElem.text;
				}
				if (this.message.contentType === MessageType.ATTEXTMESSAGE) {
					msgStr = parseAt(this.message.atElem);
				}

				return parseEmoji(msgStr)
			}
		},
		data() {
			return {

			};
		},
		methods: {
			navigate(href){
				console.log(href);
				// uni.navigateTo({
				// 	url: `/pages/common/webviewWrapper/index?url=${this.notifyContent.url}`
				// })
			}
		}
	}
</script>

<style lang="scss" scoped>

</style>
