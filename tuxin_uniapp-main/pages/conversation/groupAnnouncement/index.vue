<template>
	<view class="page_container">
		<custom-nav-bar title="群公告">
			<view class="top_right_action" slot="more">
				<text @click="editing = true" v-if="canEdit && !editing">编辑</text>
				<u-button @click="showConfirm=true" v-if="editing" :disabled="!content" type="primary" text="完成"
					size="mini"></u-button>
			</view>
		</custom-nav-bar>

		<view v-if="storeCurrentGroup.notification && !editing" class="preview_area">
			<view class="publish_title">
				<my-avatar :src="publisher.faceURL" :desc="publisher.nickname" />
				<view class="publish_details">
					<text class="name">{{publisher.nickname}}</text>
					<text class="time">{{getPublishTime}}</text>
				</view>
			</view>
			<view class="announcement_content">
				{{storeCurrentGroup.notification}}
			</view>
			<u-divider v-if="!canEdit" text="只有群主及管理员可以编辑"></u-divider>
		</view>

		<view v-if="editing" class="edit_area">
			<u-textarea v-model="content" count border="none" maxlength="200" height="240" placeholder="请编辑群公告">
			</u-textarea>
		</view>

		<u-modal content="该公告会通知全部群成员,是否发布？" asyncClose :show="showConfirm" showCancelButton
			@confirm="confirmPublish" @cancel="() => showConfirm = false"></u-modal>
	</view>
</template>

<script>
	import {
		mapGetters
	} from 'vuex'
	import IMSDK from '@/util/compatibleIM'
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
	import MyAvatar from '@/components/MyAvatar/index.vue'
	import {
		GroupMemberRole
	} from '@/constant';
	import dayjs from 'dayjs';
	import {
		toastWithCallback
	} from '../../../util/common';
	export default {
		components: {
			CustomNavBar,
			MyAvatar
		},
		data() {
			return {
				content: '',
				showConfirm: false,
				editing: false,
				publisher: {}
			};
		},
		computed: {
			...mapGetters(['storeCurrentGroup', 'storeCurrentMemberInGroup']),
			canEdit() {
				return this.storeCurrentMemberInGroup.roleLevel !== GroupMemberRole.Nomal
			},
			getPublishTime() {
				return dayjs(this.storeCurrentGroup.notificationUpdateTime * 1000).format('YYYY-MM-DD hh-mm')
			}
		},
		onLoad() {
			if (this.storeCurrentGroup.notificationUserID) {
				this.getPublisher()
			}
			this.content = this.storeCurrentGroup.notification ?? ''
		},
		methods: {
			confirmPublish() {
				IMSDK.compatibleAPI(IMSDK.IMMethods.SetGroupInfo, IMSDK.uuidv4(), this.storeCurrentGroup.groupID, {
					notification: this.content
				}).then(() => toastWithCallback('发布成功', () => {
					this.showConfirm = false
					uni.navigateBack()
				})).catch(() => uni.$u.toast('发布失败'))
			},
			getPublisher() {
				IMSDK.compatibleAPI(IMSDK.IMMethods.GetGroupMembersInfo, IMSDK.uuidv4(), this.storeCurrentGroup.groupID, [
						this.storeCurrentGroup.notificationUserID
					])
					.then(({
						data
					}) => {
						this.publisher = data[0] ?? {}
					})
			}
		}
	}
</script>

<style lang="scss">
	.top_right_action {
		margin-right: 44rpx;
	}

	.edit_area {
		height: 240px;
		padding: 0 26rpx;
	}

	.preview_area {
		height: 100%;
		position: relative;

		.publish_title {
			display: flex;
			align-items: center;
			padding: 24rpx 44rpx;
			border-bottom: 1px solid #F0F0F0;
		}

		.publish_details {
			display: flex;
			flex-direction: column;
			margin-left: 24rpx;

			.time {
				font-size: 24rpx;
				color: #999;
			}
		}

		.announcement_content {
			padding: 24rpx 44rpx;
		}

		/deep/ .u-divider {
			position: absolute;
			width: 70%;
			left: 15%;
			bottom: 10%;
		}
	}
</style>
