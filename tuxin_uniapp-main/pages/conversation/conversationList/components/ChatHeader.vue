<template>
	<view class="chat_header">
		<view class="self_info">
			途信IM
		</view>
		<view class="right_action">
			<view class="call_icon">
				<!-- <image src="@/static/images/common_call.png" ></image> -->
			</view>
			<view @click="showMore" class="more_icon">
				<image src="@/static/images/04-tianjia@2x.png" ></image>
			</view>
			<u-overlay :show="moreMenuVisible" @click="moreMenuVisible = false" opacity="0">
				<!-- <u-transition duration="0" :show="moreMenuVisible"> -->
				<view class="triangle" :style="{top:popMenuPosition.top-23+'px'}"></view>
				<view class="box_shadowing"></view>
				<view :style="{top:popMenuPosition.top-0+10+'px',right:popMenuPosition.right}" class="more_menu">
					<view @click="clickMenu(item)" v-for="item in moreMenus" :key="item.idx" class="menu_item">
						<image :src="item.icon" mode=""></image>
						<text>{{item.title}}</text>
					</view>
				</view>
				<!-- </u-transition> -->
				<!-- <view class="warp">
						<view class="rect" @tap.stop></view>
					</view> -->
			</u-overlay>

		</view>
	</view>
</template>

<script>
	import {
		mapGetters
	} from 'vuex'
	import MyAvatar from '@/components/MyAvatar/index.vue'
	import {
		GroupType
	} from '@/constant';
	import {
		scanQrCodeResult
	} from '@/util/imCommon';
	export default {
		name: 'ChatHeader',
		components: {
			MyAvatar
		},
		data() {
			return {
				moreMenuVisible: false,
				popMenuPosition: {
					top: 0,
					right: 0
				},
				moreMenus: [{
						idx: 1,
						title: '添加好友',
						icon: require("static/images/05haoyou@2x.png")
					},
					{
						idx: 2,
						title: '发起群聊',
						icon: require("static/images/05qunliao@2x.png")
					},
					{
						idx: 0,
						title: '扫一扫',
						icon: require("static/images/05saoyisao@2x.png")
					}
					
					
					// {
					// 	idx: 3,
					// 	title: '创建群聊',
					// 	icon: require("static/images/more_create_group.png")
					// },
				]
			};
		},
		computed: {
			...mapGetters(['storeSelfInfo'])
		},
		methods: {
			clickMenu({
				idx
			}) {
				switch (idx) {
					case 0:
						uni.scanCode({
							scanType: ['qrCode'],
							success: ({
								result
							}) => scanQrCodeResult(result)
						})
						break;
					case 1:
					case 2:
						uni.navigateTo({
							url: `/pages/common/searchUserOrGroup/index?isSearchGroup=${idx === 2}`
						})
						break;
					case 3:
						uni.showActionSheet({
							itemList: ['普通群', '工作群'],
							success: ({
								tapIndex
							}) => {
								uni.navigateTo({
									url: `/pages/common/createGroup/index?type=${tapIndex ? GroupType.WorkingGroup : GroupType.NomalGroup}`
								})
							}
						})
						break;
					default:
						break;
				}
			},
			async showMore() {
				const {
					right,
					bottom
				} = await this.getEl('.more_icon')
				this.popMenuPosition.right = (uni.getWindowInfo().windowWidth - right) + 'px';
				this.popMenuPosition.top = bottom
				this.moreMenuVisible = true
			},
			getEl(el) {
				return new Promise((resolve) => {
					const query = uni.createSelectorQuery().in(this)
					query.select(el).boundingClientRect(data => {
						// 存在data，且存在宽和高，视为渲染完毕
						resolve(data)
					}).exec();
				})
			},
		}
	}
</script>

<style lang="scss" scoped>
	.chat_header {
		@include btwBox();
		padding: 36rpx 44rpx;
		margin-top: var(--status-bar-height);

		.self_info {
			@include btwBox();
			font-size: 42rpx;
			font-weight: 800;
			color: #111111;
		}

		.right_action {
			display: flex;
			position: relative;
			

			.call_icon {
				margin-right: 24rpx;
				image {
					width: 23px;
					height: 23px;
				}
			}
			
			.more_icon {
				image {
					width: 24px;
					height: 23px;
				}
			}

			.more_menu {
				position: absolute;
				// bottom: 0;
				// left: 100%;
				z-index: 998;
				// transform: translate(-100%, 100%);
				box-shadow: 0px 0px 6px 2px rgba(0, 0, 0, 0.16);
				width: max-content;
				border-radius: 12rpx;
				background-color: #fff;
				padding: 12rpx 0;
				// top:116rpx;
				.menu_item {
					display: flex;
					padding: 20rpx 48rpx;
					font-size: 28rpx;
					color: $uni-text-color;
					border-bottom: 1px solid #F0F0F0;

					image {
						width: 16px;
						height: 16px;
						margin-right: 24rpx;
					}

					&:last-child {
						border: none;
					}
				}

			}
		}
		/deep/ .triangle{
			position: absolute;
			right: 50rpx;
			// top:50rpx;
			z-index: 999;
			width: 0;
			height: 0;
			border-top: 20px solid transparent;
			border-right: 10px solid transparent;
			border-bottom: 20px solid #FFFFFF;
			border-left: 10px solid transparent;
		}
		/deep/ .box_shadowing{
			position: absolute;
			width: 100vw;
			height: 100vh;
			background: #000000;
			border-radius: 0px 0px 0px 0px;
			opacity: 0.13;
		}
	}
</style>
