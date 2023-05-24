<template>
	<u-list class="generic_list" height="1">
		<u-list-item @scrolltolower="scrolltolower" lowerThreshold="100" v-for="item in genericList" :key="item.userID||item.groupID||item.conversationID">
			<global-result-item :item="item" />
		</u-list-item>
	</u-list>
</template>

<script>
	import GlobalResultItem from './GlobalResultItem.vue'
	
	export default {
		name: "",
		components: {
			GlobalResultItem
		},
		props: {
			genericList: {
				type: Array,
				default: () => []
			}
		},
		data() {
			return {

			};
		},
		methods: {
			scrolltolower() {
				this.$emit('scrolltolower')
			}
		}
	}
</script>

<style lang="scss" scoped>
	.generic_list {
		flex: 1;
	}
</style>
