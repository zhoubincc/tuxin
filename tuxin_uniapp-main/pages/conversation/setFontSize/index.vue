<template>
    <view class="page_container">
        <custom-nav-bar title="字体大小">
            <view class="nav_right_action" slot="more">
                <text @click="finishEdit">确定</text>
            </view>
        </custom-nav-bar>

        <view class="preview_container" :style="{'fontSize':sliderValueMaping}">
            <message-item-render v-for="(message,idx) in preveiwList" :key="idx" :source="message"
                :isSender="message.isSender" isPreview />
        </view>

        <view class="slider_container">
            <font-size-slider v-model="sliderValue" step="25" block-width="40" />
        </view>

    </view>
</template>

<script>
import CustomNavBar from '@/components/CustomNavBar/index.vue'
import MessageItemRender from '@/pages/conversation/chating/components/MessageItem/index.vue'
import FontSizeSlider from './FontSizeSlider.vue'

import { MessageType } from '../../../constant';

const SliderValueMaping = {
    0: '10px',
    25: '12px',
    50: '14px',
    75: '16px',
    100: '18px',
}

export default {
    name: "",
    components: {
        CustomNavBar,
        MessageItemRender,
        FontSizeSlider
    },
    data() {
        return {
            sliderValue: 0,
            preveiwList: [
                {
                    isSender: true,
                    contentType: MessageType.TEXTMESSAGE,
                    content: '预览字体大小',
                    senderFaceUrl: 'ic_avatar_01'
                },
                {
                    isSender: false,
                    contentType: MessageType.TEXTMESSAGE,
                    content: '拖动下面滑块，可设置字体大小',
                    senderFaceUrl: 'ic_avatar_02'
                },
                {
                    isSender: false,
                    contentType: MessageType.TEXTMESSAGE,
                    content: '设置后，会改变聊天和工作圈的字体大小。',
                    senderFaceUrl: 'ic_avatar_02'
                }
            ]
        };
    },
    computed: {
        sliderValueMaping() {
            return SliderValueMaping[this.sliderValue]
        }
    },
    onLoad() {
        this.getInvertMaping()
    },
    methods: {
        finishEdit() {
            uni.setStorageSync('RootFontSize',this.sliderValueMaping)
			this.$store.commit('user/SET_ROOT_FONT_SIZE',this.sliderValueMaping)
			uni.reLaunch({
				url: '/pages/conversation/conversationList/index'
			})
        },
        getInvertMaping() {
            const invertMap = Object.keys(SliderValueMaping).reduce((acc, key) => {
                acc[SliderValueMaping[key]] = key;
                return acc;
            }, {});
            this.sliderValue = invertMap[this.$store.getters.storeRootFontSize]
        }
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

    .preview_container {
        flex: 1;
    }

    .slider_container {
        height: 200rpx;
        background-color: #fff;
        padding: 44rpx 44rpx 0;
    }
}
</style>
