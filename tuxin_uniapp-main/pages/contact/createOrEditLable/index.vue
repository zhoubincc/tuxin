<template>
	<view class="page_container">
		<custom-nav-bar :title="originData ? '修改标签' : '新建标签'">
			<view class="nav_right_action" slot="more">
				<text v-show="!loading" @click="finishEdit">完成</text>
				<u-loading-icon v-show="loading"/>
			</view>
		</custom-nav-bar>

		<view class="info_row">
			<text class="filed_title">标签名字</text>
			<u--input placeholder="请输入标签名称" border="none" v-model="tagName" maxlength="20"></u--input>
		</view>

		<view class="info_row member_row" :class="{'member_row_has':userList.length>0 }">
			<view class="wrap">
				<view>
					<text class="filed_title">标签成员</text>
					<text class="placeholder">请选择标签成员</text>
				</view>
				<view class="tag_container" v-if="userList.length>0">
					<view class="tag" v-for="user in userList" :key="user.userID">
						<text class="tag_title">{{user.nickname||user.userName}}</text>
						<u-icon name="close" color="#9C9E9F" size="10" @click="removeItem(user)"></u-icon>
					</view>
				</view>
			</view>
			<view class="choose_btn" @click="toChooseMember">
				<u-icon name="plus" color="#fff" size="18"></u-icon>
			</view>
		</view>
	</view>
</template>

<script>
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	import {
		createTag,
		updateTag
	} from '@/api/imApi';
	import { ContactChooseTypes } from '@/constant';
	import {
		toastWithCallback
	} from '@/util/common';
	export default {
		components: {
			CustomNavBar
		},
		data() {
			return {
				tagName: '',
				userList: [],
				originData: null,
				loading: false,
			};
		},
		onLoad(options) {
			if (options.tagData) {
				this.originData = JSON.parse(options.tagData)
				this.tagName = this.originData.tagName
				this.userList = this.originData.userList
			}
		},
		methods: {
			removeItem(user) {
				const tmpList = [...this.userList]
				const idx = tmpList.findIndex(item => item.userID === user.userID)
				if (idx > -1) {
					tmpList.splice(idx, 1)
					this.userList = [...tmpList]
				}
			},
			toChooseMember(){
				uni.$u.route('/pages/common/contactChoose/index',{
					type: ContactChooseTypes.GetList,
					checkedUserIDList: JSON.stringify(this.userList.map(item => item.userID))
				})
			},
			getCheckedUsers(data){
				console.log(data);
				this.userList = [...data]
			},
			finishEdit() {
				if(!this.tagName || this.userList.length ===0){
					uni.$u.toast('请先完成信息填写！')
					return;
				}
				
				this.loading = true
				if (this.originData) {
					const originIDList = this.originData.userList.map(user => user.userID)
					const newIDList = this.userList.map(user => user.userID)
					const reduceUserIDList = []
					this.originData.userList.map(item => !newIDList.includes(item.userID) && reduceUserIDList.push(item.userID))
					const increaseUserIDList = []
					this.userList.map(item => !originIDList.includes(item.userID) && increaseUserIDList.push(item.userID))
					updateTag({
						tagID: this.originData.tagID,
						newName: this.tagName,
						increaseUserIDList,
						reduceUserIDList,
					}).then(() => toastWithCallback('修改成功', () => uni.navigateBack())).finally(() => this.loading =
						false)
				} else {
					createTag(this.tagName, this.userList.map(item => item.userID)).then(() => toastWithCallback('新增成功',
					() => uni.navigateBack())).finally(() => this.loading =
						false)
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page_container {
		background-color: #f8f8f8;

		.nav_right_action {
			padding-right: 44rpx;
		}

		.info_row {
			position: relative;
			display: flex;
			padding: 36rpx 32rpx;
			margin: 24rpx 44rpx;
			background-color: #fff;
			border-radius: 12rpx;

			.filed_title {
				margin-right: 48rpx;
			}

			.placeholder {
				color: rgb(192, 196, 204);
			}

			.tag_container {
				display: flex;
				flex-wrap: wrap;
				margin-top: 24rpx;
				max-height: 60vh;
				overflow-y: auto;

				.tag {
					display: flex;
					padding: 8rpx 18rpx;
					font-size: 24rpx;
					border: 1px solid #C7C7C8;
					border-radius: 12rpx;
					margin-right: 36rpx;
					margin-bottom: 24rpx;

					&_title {
						@include nomalEllipsis();
						max-width: 240rpx;
						margin-right: 24rpx;
					}
				}
			}

			.choose_btn {
				position: absolute;
				right: 56rpx;
				bottom: 36rpx;
				display: flex;
				justify-content: center;
				align-items: center;
				width: 102rpx;
				height: 52rpx;
				background-color: #236ffe;
				border-radius: 24rpx;
				margin-left: 48rpx;
			}
		}

		.member_row {
			margin-top: 0;

			&_has {
				padding-bottom: 124rpx;
			}
		}

	}
</style>
