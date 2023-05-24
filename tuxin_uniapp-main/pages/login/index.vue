<template>
	<view class="page_container">
		<view class="login">
			<view class="title">欢迎使用OpenIM</view>
			<view class="loginType">
				<text class="loginType-item loginType-active">手机号</text>
			</view>
			<u-form class="loginForm" labelPosition="top" :model="loginInfo" :rules="rules" :labelStyle="{
        fontSize: '14px',
        marginTop: '20rpx',
		minWidth: '96rpx'
      }" ref="loginForm">
				<u-form-item prop="phoneNumber" borderBottom>
					<u-input v-model="loginInfo.phoneNumber" border="none" placeholder="请输入手机号码" clearable>
						<view slot="prefix" class="phoneNumber_areacode" @click="showPicker">
							<text class="areacode_content">+{{ loginInfo.areaCode }}</text>
							<u-icon class="arrow_down" name="arrow-down"></u-icon>
						</view>
					</u-input>
				</u-form-item>
				<u-form-item v-show="isPwdLogin" label="密码" prop="password" borderBottom>
					<u-input v-model="loginInfo.password" border="none" placeholder="请输入密码" :password="!eying">
						<u-icon @click="updateEye" slot="suffix" :name="eying ? 'eye-off' :'eye'">
						</u-icon>
					</u-input>
				</u-form-item>
				<u-form-item v-show="!isPwdLogin" label="验证码" prop="verificationCode" borderBottom>
					<u-input v-model="loginInfo.verificationCode" border="none" placeholder="请输入验证码">
						<view class="code_btn" slot="suffix" @click="getCode">
							{{ count !== 0 ? `${count} s` : '获取验证码' }}
						</view>
					</u-input>
				</u-form-item>
			</u-form>
			<view class="other">
				<text class="forget" @click="toggleLoginMethod">{{ isPwdLogin ? '验证码登录' : '密码登录' }}</text>
			</view>
			<view class="login-btn">
				<u-button :loading="loading" type="primary" @click="startLogin" :disabled="!canLogin">
					登录
				</u-button>
			</view>
			<view class="agreement">
				<u-checkbox-group v-model="checked">
					<u-checkbox iconSize="12" labelSize="12" shape="circle" label="我已阅读并同意：" :name="true">
					</u-checkbox>
				</u-checkbox-group>
				<text class="detail">《服务协议》,</text>
				<text class="detail">《隐私政策》</text>
			</view>

			<AreaPicker ref="AreaPicker" @chooseArea="chooseArea" />
		</view>

		<view class="action_bar">
			<text @click="toRegisterOrForget(false)">忘记密码</text>
			<view class="tap_line"></view>
			<text @click="toRegisterOrForget(true)">手机号注册</text>
		</view>
	</view>
</template>

<script>
	import {
		v4 as uuidv4
	} from "uuid";
	import md5 from "md5";
	import {
		businessLogin,
		businessSendSms
	} from "@/api/login";
	import AreaPicker from "@/components/AreaPicker";
	import {
		checkLoginError
	} from "@/util/common";
	import {
		SmsUserFor
	} from "@/constant";

	let timer

	export default {
		components: {
			AreaPicker,
		},
		data() {
			return {
				loginInfo: {
					phoneNumber: "",
					password: "",
					areaCode: "86",
					verificationCode: undefined
				},
				checked: [true],
				eying: false,
				loading: false,
				count: 0,
				isPwdLogin: true
			};
		},
		computed: {
			canLogin() {
				return this.checked[0] && this.loginInfo.phoneNumber && this.loginInfo.password
			},
			rules() {
				return {
					password: this.isPwdLogin ? [{
						type: "string",
						required: true,
						message: "请输入密码",
						trigger: ["blur", "change"],
					}, ] : [],
					phoneNumber: [{
						type: "string",
						required: true,
						message: "请输入手机号码",
						trigger: ["blur", "change"],
					}, ],
					verificationCode: !this.isPwdLogin ? [{
						type: "string",
						required: true,
						message: "请输入验证码",
						trigger: ["blur", "change"],
					}] : []
				}
			}
		},
		onLoad(options) {
			// if(options.isRedirect){
			// 	plus.navigator.closeSplashscreen();
			// }
			this.init();
		},
		methods: {
			init() {
				if (process.env.NODE_ENV === "development") {
					this.loginInfo.phoneNumber = "15600000000";
					this.loginInfo.password = "123456";
				} else {
					this.loginInfo.phoneNumber = uni.getStorageSync('lastPhoneNumber') || '';
					this.loginInfo.areaCode = uni.getStorageSync('lastAreaCode') || '86';
				}
			},
			updateEye() {
				this.eying = !this.eying
			},
			toRegisterOrForget(isRegister) {
				uni.$u.route("/pages/login/registerOrForget/index", {
					isRegister,
				});
			},
			startLogin() {
				this.$refs.loginForm.validate().then(async (valid) => {
					this.loading = true;
					this.saveLoginInfo()
					try {
						const data = await businessLogin({
							phoneNumber: this.loginInfo.phoneNumber,
							areaCode: `+${this.loginInfo.areaCode}`,
							password: md5(this.loginInfo.password),
							platform: uni.$u.os() === 'ios' ? 1 : 2,
							verificationCode: this.loginInfo.verificationCode,
							OperationID: uuidv4(),
						});
						console.log(data);
						const {
							imToken,
							chatToken,
							userID
						} = data;
						// await this.$IMSDK
						// 	.compatibleAPI("login", uuidv4(), userID, imToken)
						this.saveLoginProfile(data);
						this.$store.commit("user/SET_AUTH_DATA", data);
						this.$store.dispatch("user/getSelfInfo");
						this.$store.dispatch("conversation/getConversationList");
						this.$store.dispatch("conversation/getUnReadCount");
						this.$store.dispatch("contact/getFriendList");
						this.$store.dispatch("contact/getGrouplist");
						this.$store.dispatch("contact/getBlacklist");
						this.$store.dispatch("contact/getRecvFriendApplications");
						this.$store.dispatch("contact/getSentFriendApplications");
						this.$store.dispatch("contact/getRecvGroupApplications");
						this.$store.dispatch("contact/getSentGroupApplications");
						uni.switchTab({
							url: '/pages/conversation/conversationList/index'
						})
					} catch (err) {
						console.error(err);
						uni.$u.toast(checkLoginError(err))
					}
					this.loading = false;
				})
			},
			saveLoginProfile(data) {
				const {
					imToken,
					chatToken,
					userID
				} = data;
				uni.setStorage({
					key: 'IMUserID',
					data: userID
				})
				uni.setStorage({
					key: 'IMToken',
					data: imToken
				})
				uni.setStorage({
					key: 'BusinessToken',
					data: chatToken
				})
			},
			saveLoginInfo() {
				uni.setStorage({
					key: 'lastPhoneNumber',
					data: this.loginInfo.phoneNumber
				})
				uni.setStorage({
					key: 'lastAreaCode',
					data: this.loginInfo.areaCode
				})
			},
			showPicker() {
				this.$refs.AreaPicker.init();
			},
			chooseArea(areaCode) {
				this.loginInfo.areaCode = areaCode;
			},
			toggleLoginMethod() {
				this.isPwdLogin = !this.isPwdLogin
			},
			getCode() {
				if (!this.loginInfo.phoneNumber) {
					uni.$u.toast('请先输入手机号！')
					return
				}

				if (this.count !== 0) {
					return;
				}

				const options = {
					phoneNumber: this.loginInfo.phoneNumber,
					areaCode: `+${this.loginInfo.areaCode}`,
					usedFor: SmsUserFor.Login,
					operationID: Date.now() + ""
				}
				businessSendSms(options).then(() => {
					uni.$u.toast('验证码已发送！')
					this.startCount()
				}).catch(err => {
					console.error(err);
					uni.$u.toast(checkLoginError(err))
				})
			},
			startCount() {
				if (timer) {
					clearInterval(timer)
				}
				this.count = 60
				timer = setInterval(() => {
					if (this.count > 0) {
						this.count--
					}
				}, 1000)
			},
		},
	};
</script>
<style lang="scss" scoped>
	.page_container {
		justify-content: space-between;

		.login {
			color: #333333;
			padding: 10vh 80rpx 0;

			.title {
				font-size: 64rpx;
				font-weight: 600;
				margin-bottom: 116rpx;
			}

			.loginType {
				margin-bottom: 36rpx;

				&-item {
					margin-right: 68rpx;
					font-size: 28rpx;
					font-weight: 400;
					border-radius: 4rpx;
					padding: 2rpx 0;
				}

				&-active {
					color: $u-primary;
					border-bottom: 4rpx solid $u-primary;
				}
			}

			.loginForm {
				.phoneNumber-code {
					display: flex;
					align-items: center;
					font-size: 36rpx;
					border-right: 2rpx solid #d8d8d8;
					margin-right: 58rpx;

					.code {
						font-weight: 400;
						margin-right: 20rpx;
					}

					.icon {
						margin-right: 40rpx;
					}
				}

				.eye {
					.image {
						width: 44rpx;
						height: 32rpx;
					}
				}

				.code_btn {
					color: $u-primary;
				}
			}

			.other {
				margin-top: 29rpx;
				font-size: 24rpx;
				font-weight: 400;
				color: $u-primary;
			}

			.login-btn {
				margin-top: 8vh;
			}

			.agreement {
				display: flex;
				align-items: flex-start;
				margin-top: 36rpx;

				.detail {
					font-size: 24rpx;
					font-weight: 400;
					color: $u-primary;
				}
			}
		}

		.action_bar {
			display: flex;
			justify-content: center;
			margin-bottom: 96rpx;
			font-size: 24rpx;
			font-weight: 400;
			color: $u-primary;

			.tap_line {
				width: 1px;
				margin: 0 24rpx;
				background-color: #999;
				transform: scale(0.5, 0.8);
			}
		}
	}
</style>
