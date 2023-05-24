<template>
	<view class="page_container">
		<custom-nav-bar :title="title" />

		<u-list class="message_list" height="1">
			<u-list-item v-for="message in mergeList" :key="message.clientMsgID">
				<nomal-message-item @click="clickMessage" :source="message" />
			</u-list-item>
		</u-list>
	</view>
</template>

<script>
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	import {
		MessageType
	} from '@/constant';
	import NomalMessageItem from "../searchMessage/components/NomalMessageItem.vue"
	export default {
		components: {
			CustomNavBar,
			NomalMessageItem
		},
		data() {
			return {
				mergeList: [],
				title: ''
			};
		},
		onLoad(options) {
			const mergeData = JSON.parse(options.mergeData)
			this.mergeList = mergeData.multiMessage
			this.title = mergeData.title
		},
		methods: {
			clickMessage(message) {
				switch (message.contentType) {
					case MessageType.PICTUREMESSAGE:
						uni.previewImage({
							urls: [message.pictureElem.sourcePicture.url]
						})
						break;
					case MessageType.VIDEOMESSAGE:
						uni.$u.route('/pages/conversation/previewVideo/index', {
							previewVideoUrl: message.videoElem.videoUrl
						})
						break;
					case MessageType.CARDMESSAGE:
						let cardInfo = {}
						try {
							cardInfo = JSON.parse(message.content)
						} catch (error) {}
						if (!cardInfo.userID) return
						
						uni.$u.route('/pages/common/userCard/index', {
							sourceID: cardInfo.userID
						})
						break;
					case MessageType.LOCATIONMESSAGE:
						let locationInifo = {};
						try {
							locationInifo = JSON.parse(message.locationElem.description)
						} catch (e) {}
						if (!locationInifo.latng) return
						
						uni.$u.route('/pages/conversation/previewLocation/index', {
							latng: locationInifo.latng
						})
						break;
					default:
						break;
				}
			}
		},

	}
</script>

<style lang="scss" scoped>
	.page_container {
		background-color: #f8f8f8;

		.message_list {
			flex: 1;
			margin-top: 24rpx;


		}
	}
</style>
