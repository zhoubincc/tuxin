<template>
	<view class="page_container">
		<custom-nav-bar :title="previewUrl ? '效果阅览' : '设置聊天背景'">
			<view v-show="previewUrl" class="nav_right_action" slot="more">
				<text v-show="!loading" @click="finishSet">确定</text>
				<u-loading-icon v-show="loading" />
			</view>
		</custom-nav-bar>

		<view v-if="!previewUrl" class="setting_row" style="padding: 0;">
			<setting-item @click="toChoose" title="从相册中选择" />
			<setting-item @click="resetDefault" title="恢复默认背景" :border="false" />
		</view>

		<view v-else class="preview_container" :style="{'background-image':`url(${previewUrl})`}">

		</view>

	</view>
</template>

<script>
	import IMSDK from '@/util/compatibleIM'
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	import SettingItem from '@/components/SettingItem/index.vue'
	import {
		copyFileToDoc,
		getPurePath,
		toastWithCallback
	} from '@/util/common';
	export default {
		name: "",
		components: {
			CustomNavBar,
			SettingItem
		},
		data() {
			return {
				previewUrl: '',
				loading: false
			};
		},
		// onLoad() {
		// 	this.setUploadListener();
		// },
		// onUnload() {
		// 	this.disposeUploadListener();
		// },
		methods: {
			finishSet() {
				this.loading = true
				// IMSDK.IMApi.uploadFile(IMSDK.uuidv4(), getPurePath(this.previewUrl))
				copyFileToDoc(this.previewUrl)
					.then(path => {
						const bgMap = uni.getStorageSync('IMBgMap') || {}
						bgMap[this.$store.getters.storeCurrentConversation.conversationID] = path
						uni.setStorage({
							key: 'IMBgMap',
							data: bgMap
						})
						toastWithCallback('设置成功！', () => {
							uni.reLaunch({
								url: '/pages/conversation/conversationList/index'
							})
							this.previewUrl = ''
							this.loading = false
						})
					}).catch(err => uni.$u.toast('设置失败！'))
			},
			toChoose() {
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album'],
					success: ({
						tempFilePaths,
						tempFiles
					}) => {
						this.previewUrl = tempFilePaths[0]
						console.log(tempFilePaths);
						console.log(tempFiles);
					},
					fail: function(err) {
						console.log(err);
					}
				})
			},
			resetDefault() {
				const bgMap = uni.getStorageSync('IMBgMap') || {}
				bgMap[this.$store.getters.storeCurrentConversation.conversationID] = ''
				uni.setStorage({
					key: 'IMBgMap',
					data: bgMap
				})
				uni.$u.toast('重置成功！')
				uni.reLaunch({
					url: '/pages/conversation/conversationList/index'
				})
			},
			uploadSuccessHandler({
				data
			}) {
				const bgMap = uni.getStorageSync('IMBgMap') || {}
				bgMap[this.$store.getters.storeCurrentConversation.conversationID] = data
				uni.setStorage({
					key: 'IMBgMap',
					data: bgMap
				})
				toastWithCallback('设置成功！', () => {
					uni.reLaunch({
						url: '/pages/conversation/conversationList/index'
					})
					this.previewUrl = ''
					this.loading = false
				})
			},
			uploadFailedHandler() {
				uni.$u.toast('上传失败')
				this.loading = false
			},
			// uploadProgressHandler({progress,operationID}) {
			// 	console.log('uploadProgressHandler:::');
			// 	console.log(progress,operationID);
			// },
			setUploadListener() {
				IMSDK.subscribe(IMSDK.IMEvents.UploadFileSuccess, this.uploadSuccessHandler)
				IMSDK.subscribe(IMSDK.IMEvents.UploadFileFailed, this.uploadFailedHandler)
				// IMSDK.subscribe(IMSDK.IMEvents.UploadFileProgress,this.uploadProgressHandler)
			},
			disposeUploadListener() {
				IMSDK.unsubscribe(IMSDK.IMEvents.UploadFileSuccess, this.uploadSuccessHandler)
				IMSDK.unsubscribe(IMSDK.IMEvents.UploadFileFailed, this.uploadFailedHandler)
			},
		},
		onBackPress() {
			if (this.previewUrl) {
				this.previewUrl = ''
				return true
			}
			return false
		}
	}
</script>

<style lang="scss" scoped>
	.page_container {
		background-color: #f8f8f8;

		.nav_right_action {
			font-size: 14px;
			padding-right: 44rpx;
		}

		.setting_row {
			background-color: #fff;
			padding: 0 44rpx;
			margin: 12rpx 0;
		}

		.preview_container {
			flex: 1;
			background-repeat: no-repeat;
			background-size: 100% 100%;
		}
	}
</style>
