<template>
	<view class="page_container">
		<custom-nav-bar title="标签">
			<view class="nav_right_action" slot="more">
				<text v-show="renderList.length>0" @click="opTag">{{showCheck ? '删除' : '编辑'}}</text>
			</view>
		</custom-nav-bar>
		<view class="search_bar_wrap">
			<u-search class="search_bar" shape="square" placeholder="搜索" :showAction="false" v-model="keyword" />
		</view>
		
		
		<u-list class="tag_list" v-if="renderList.length>0">
			<u-list-item v-for="tag in renderList" :key="tag.tagID">
				<view class="tag_record" @click="clickTag(tag)">
					<view v-if="showCheck" class="check_wrap"
						:class="{'check_wrap_active':checkedTagIDs.includes(tag.tagID)}">
						<u-icon v-show="checkedTagIDs.includes(tag.tagID)" name="checkbox-mark" size="12" color="#fff" />
					</view>
					<view class="tag_wrap">
						<view class="tag_name">
							{{tag.tagName}}
						</view>
						<view class="tag_content">
							{{ getTagMember(tag.userList) }}
						</view>
					</view>
				</view>	
			</u-list-item>
		</u-list>
		
		<view class="empty" v-else>
			<image src="@/static/images/empty_lable.png" alt=""/>
			<text>当前暂无标签</text>
		</view>
		
		<view class="floating_btn" @click="toCreateLable">
			<u-icon name="plus" color="#fff" size="36"></u-icon>
		</view>
		<u-modal content="确定要删除选中标签吗？" asyncClose :show="showConfirm" showCancelButton @confirm="confirmDelete"
			@cancel="() => showConfirm = false"></u-modal>
	</view>
</template>

<script>
	import CustomNavBar from '@/components/CustomNavBar/index.vue'
import { deleteTag, getAllTags } from '@/api/imApi';
	export default {
		components: {
			CustomNavBar
		},
		data() {
			return {
				tagList: [],
				checkedTagIDs: [],
				showCheck: false,
				showConfirm: false,
				keyword: ''
			};
		},
		computed: {
			getTagMember(){
				return (userList) => {
					let str = ''
					const tmpList = userList.slice(0,10)
					tmpList.map((user,idx)=>{
						str +=`${user.userName}${idx=== tmpList.length -1 ? '' :'、'}`
					})
					return str
				}
			},
			renderList(){
				return this.keyword ? this.tagList.filter(tag=>tag.tagName.includes(this.keyword)) : this.tagList
			}
		},
		onShow() {
			this.getTagsData();
		},
		methods: {
			getTagsData() {
				getAllTags().then(res=>{
					console.log(res);
					this.tagList = res.tags
				})
			},
			toCreateLable() {
				uni.$u.route('/pages/contact/createOrEditLable/index')
			},
			opTag() {
				if(this.showCheck){
					this.showConfirm = true
				}else {
					this.showCheck = true
				}
			},
			clickTag(tag) {
				if(this.showCheck){
					const tmpList = [...this.checkedTagIDs]
					const idx = tmpList.findIndex(item=>item===tag.tagID)
					if(idx>-1){
						tmpList.splice(idx,1)
					}else{
						tmpList.push(tag.tagID)
					}
					this.checkedTagIDs = [...tmpList]
				}else {
					uni.$u.route('/pages/contact/createOrEditLable/index',{
						tagData: JSON.stringify(tag)
					})
				}
			},
			confirmDelete() {
				if(this.checkedTagIDs.length === 0){
					return;
				}
				const promiseArr = this.checkedTagIDs.map(tagID=>deleteTag(tagID))
				Promise.all(promiseArr).then(()=>{
					this.getTagsData();
					uni.$u.toast('删除成功！')
				}).catch(()=>uni.$u.toast('删除失败！')).finally(()=>{
					this.checkedTagIDs = []
					this.showCheck = false
					this.showConfirm = false
				})
			}
		},
		onBackPress() {
			if(this.showCheck){
				this.checkedTagIDs = []
				this.showCheck = false
				return true
			}
			return false
		}
	}
</script>

<style lang="scss" scoped>
.page_container {
	position: relative;
	background-color: #f8f8f8;
	
	.nav_right_action {
		padding-right: 44rpx;
	}
	
	.search_bar_wrap {
		height: 34px;
		padding: 12px 22px;
	}
	
	.tag_list {
		flex: 1;
		overflow-y: hidden;
		margin-top: 24rpx;
		
		.tag_record {
			display: flex;
			padding: 24rpx 44rpx;
			background-color: #fff;
			
			.check_wrap {
				@include centerBox();
				box-sizing: border-box;
				width: 40rpx;
				min-width: 40rpx;
				height: 40rpx;
				min-height: 40rpx;
				border: 2px solid #979797;
				border-radius: 50%;
				margin-top: 16rpx;
				margin-right: 24rpx;
			
				&_active {
					background-color: #1D6BED;
					border: none;
				}
			}
			
			.tag_wrap {
				flex:1;
				overflow: hidden;
			}
			
			.tag_name {
				@include nomalEllipsis();
				max-width: 360rpx;
				font-weight: 500;
				margin-bottom: 8rpx;
			}
			
			.tag_content {
				@include nomalEllipsis();
				font-size: 24rpx;
				color: #ADADAD;
			}
		}
	}
	
	.empty {
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		color: #999;
		margin-top: 10vh;
		
		image {
			width: 123px;
			height: 123px;
		}
	}
	
	.floating_btn {
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
		bottom: 5vh;
		right: 5vw;
		width: 136rpx;
		height: 136rpx;
		background-color: #2172ec;
		border-radius: 50%;
		box-shadow: 0 4px 6px -1px rgba(#000 , 0.3), 0 2px 4px -2px rgba(#000 , 0.3);
	}
}
</style>
