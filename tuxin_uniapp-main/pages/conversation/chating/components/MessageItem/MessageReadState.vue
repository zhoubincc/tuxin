<template>
	<view>
		<text @click="toMemberRead" class="read_state">{{getReadStateStr}}</text>
	</view>
</template>

<script>
	import {
		SessionType
	} from "@/constant"
	export default {
		name: "",
		components: {},
		props: {
			message: Object,
		},
		data() {
			return {

			};
		},
		computed: {
			unReadCount() {
				if (this.message.sessionType === SessionType.Single) {
					return 0
				}
				return this.message.attachedInfoElem.groupHasReadInfo.groupMemberCount - this.message.attachedInfoElem
					.groupHasReadInfo.hasReadCount - 1
			},
			getReadStateStr() {
				if (this.message.sessionType === SessionType.Single) {
					return this.message.isRead ? '已读' : '未读'
				}
				if (this.message.sessionType !== SessionType.Notification) {
					return this.unReadCount < 1 ? '全部已读' : `${this.unReadCount}未读`
				}
			}
		},
		methods: {
			toMemberRead() {
				if (this.message.sessionType === SessionType.Single) {
					return;
				}
				uni.$u.route("/pages/conversation/groupMessageReadState/index", {
					messageState: JSON.stringify({
						groupID: this.message.groupID,
						hasReadUserIDList: this.message.attachedInfoElem
							.groupHasReadInfo.hasReadUserIDList ?? [],
						memberCount: this.message.attachedInfoElem.groupHasReadInfo.groupMemberCount,
						sendTime: this.message.sendTime
					})
				});
			}
		}
	}
</script>

<style lang="scss" scoped>
	.read_state {
		// font-size: 26rpx;
		font-size: 0.93rem;
		color: $u-primary;
	}
</style>
