<template>
	<view class="page_container">
		<custom-nav-bar title="设置禁言">
			<view class="top_right_action" slot="more">
				<u-button v-show="choosed || customValue" @click="confirmMute" :loading='loading' type="primary"
					text="完成" size="mini"></u-button>
			</view>
		</custom-nav-bar>

		<view class="choose_area">
			<view @click="chooseItem(item)" v-for="item in chooseList" :key="item.title" class="choose_item">
				<view>{{item.title}}</view>
				<u-icon v-show="choosed === item.value && customValue === ''" name="checkbox-mark" color="#1D6BED">
				</u-icon>
			</view>
			<view class="choose_item">
				<view>自定义</view>
				<view style="width: 70px;">
					<u-input placeholder="请输入" border="none" type="number" v-model="customValue">
						<template slot="suffix">
							<text>天</text>
						</template>
					</u-input>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import IMSDK from '@/util/compatibleIM'
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	export default {
		components: {
			CustomNavBar,
		},
		data() {
			return {
				choosed: 0,
				loading: false,
				customValue: '',
				sourceInfo: {},
				chooseList: [{
						title: '10分钟',
						value: 600
					},
					{
						title: '1小时',
						value: 3600
					},
					{
						title: '12小时',
						value: 43200
					},
					{
						title: '1天',
						value: 86400
					},
				]
			};
		},
		onLoad(options) {
			const {
				sourceInfo
			} = options
			this.sourceInfo = JSON.parse(sourceInfo)
		},
		methods: {
			confirmMute() {
				this.loading = true
				let seconds = this.choosed
				if (this.customValue !== '') {
					seconds = this.customValue * 86400
				}
				IMSDK.compatibleAPI(IMSDK.IMMethods.ChangeGroupMemberMute, IMSDK.uuidv4(), this.sourceInfo.groupID, this
						.sourceInfo.userID, seconds)
					.then(() => {
						uni.$u.toast('设置成功')
						setTimeout(() => uni.navigateBack(), 1000)
					}).catch(() => uni.$u.toast('设置失败'))
					.finally(() => this.loading = false)
			},
			chooseItem({
				value
			}) {
				this.choosed = value;
				this.customValue = ''
			},
		}
	}
</script>

<style lang="scss">
	.page_container {
		background-color: #f2f2f2;

		.top_right_action {
			margin-right: 44rpx;
		}

		.choose_area {
			background-color: #fff;

			.choose_item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 24rpx 44rpx;
				border-bottom: 1px solid #F0F0F0;
			}
		}
	}
</style>
