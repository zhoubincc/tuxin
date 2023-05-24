<script>
	import {
		mapGetters,
		mapActions
	} from "vuex";
	import IMSDK from "@/util/compatibleIM";
	import config from "./common/config";
	import {
		getDbDir,
		Igexin,
		toastWithCallback
	} from "@/util/common.js";
	import {
		conversationSort, secFormat
	} from "@/util/imCommon.js";
	import {
		SessionType,
		MessageType,
		PageEvents,
		UpdateMessageTypes,
		OptType,
		CustomType,
	} from "@/constant";
	import {
		getRtcInvitaion
	} from "@/api/imApi";
	import {
		checkUpdateFormPgyer
	} from "@/api/checkUpdate";
	import NotificationUtil from "./util/notification";
	import newMessage from '@/static/audio/newMessage.wav'

	let cacheConversationList = [];
	let updateDownloadTask = null;
	let notificationIntance = null;
	let pausing = false
	let innerAudioContext

	const GroupSessionTypes = [SessionType.Group, SessionType.WorkingGroup];

	export default {
		onLaunch: function() {
			console.log("App Launch");
			// Igexin.turnOnPush();
			innerAudioContext = uni.createInnerAudioContext();
			innerAudioContext.autoplay = false;
			innerAudioContext.src = newMessage;

			this.$store.dispatch("user/getAppConfig");
			this.launchCheck();
			this.setGlobalIMlistener();
			this.setPageListener();
			this.tryLogin();
			this.checkVersion();
		},
		onShow: function() {
			console.log("App Show");
			IMSDK.compatibleAPI(IMSDK.IMMethods.WakeUp, IMSDK.uuidv4())
			// IMSDK.compatibleAPI(IMSDK.IMMethods.SetAppBackgroundStatus, IMSDK.uuidv4(), false)
		},
		onHide: function() {
			console.log("App Hide");
			// IMSDK.compatibleAPI(IMSDK.IMMethods.SetAppBackgroundStatus, IMSDK.uuidv4(), true)
		},
		computed: {
			...mapGetters([
				"storeConversationList",
				"storeCurrentConversation",
				"storeCurrentUserID",
				"storeSelfInfo",
				"storeRecvFriendApplications",
				"storeRecvGroupApplications",
				"storeHistoryMessageList",
				"storeIsSyncing",
			]),
			contactBadgeRely() {
				return {
					recvFriendApplications: this.storeRecvFriendApplications,
					recvGroupApplications: this.storeRecvGroupApplications,
					userKey: this.storeCurrentUserID,
				};
			},
		},
		methods: {
			...mapActions("message", ["pushNewMessage", "updateOneMessage"]),
			...mapActions("conversation", ["updateCurrentMemberInGroup"]),
			...mapActions("contact", [
				"updateFriendInfo",
				"pushNewFriend",
				"updateBlackInfo",
				"pushNewBlack",
				"pushNewGroup",
				"updateGroupInfo",
				"pushNewRecvFriendApplition",
				"updateRecvFriendApplition",
				"pushNewSentFriendApplition",
				"updateSentFriendApplition",
				"pushNewRecvGroupApplition",
				"updateRecvGroupApplition",
				"pushNewSentGroupApplition",
				"updateSentGroupApplition",
			]),
			setGlobalIMlistener() {
				console.log('setGlobalIMlistener');
				// init
				const kickHander = (message) => {
					toastWithCallback(message, () => {
						uni.removeStorage({
							key: 'IMToken'
						})
						uni.removeStorage({
							key: 'BusinessToken'
						})
						// Igexin.unbindAlias(this.storeCurrentUserID)
						uni.$u.route('/pages/login/index')
					})
				}
				IMSDK.subscribe(IMSDK.IMEvents.OnConnectFailed, (data) => {
					console.log(data);
					if (data.errCode === 705) {
						kickHander('您的登录已过期，请重新登陆！')
					}
				});
				IMSDK.subscribe(IMSDK.IMEvents.OnConnecting, (data) => {
					console.log(data);
				});
				IMSDK.subscribe(IMSDK.IMEvents.OnConnectSuccess, (data) => {
					console.log(data);
				});
				IMSDK.subscribe(IMSDK.IMEvents.OnKickedOffline, (data) => {
					kickHander('您的账号在其他设备登录，请重新登陆！')
				});
				IMSDK.subscribe(IMSDK.IMEvents.OnUserTokenExpired, (data) => {
					kickHander('您的登录已过期，请重新登陆！')
				});

				// sync
				const syncStartHandler = () => {
					uni.showLoading({
						title: "同步中",
						mask: true,
					});
					this.$store.commit("user/SET_IS_SYNCING", true);
				};
				const syncFinishHandler = () => {
					uni.hideLoading();
					this.$store.dispatch("conversation/getConversationList");
					this.$store.dispatch("conversation/getUnReadCount");
					this.$store.commit("user/SET_IS_SYNCING", false);
				};
				const syncFailedHandler = () => {
					uni.hideLoading();
					uni.$u.toast("同步消息失败");
					this.$store.dispatch("conversation/getConversationList");
					this.$store.dispatch("conversation/getUnReadCount");
					this.$store.commit("user/SET_IS_SYNCING", false);
				};
				IMSDK.subscribe(IMSDK.IMEvents.OnSyncServerStart, syncStartHandler);
				IMSDK.subscribe(IMSDK.IMEvents.OnSyncServerFinish, syncFinishHandler);
				IMSDK.subscribe(IMSDK.IMEvents.OnSyncServerFailed, syncFailedHandler);

				// self
				const selfInfoUpdateHandler = ({
					userInfo
				}) => {
					const info = JSON.parse(userInfo);
					delete info.birth;
					this.$store.commit("user/SET_SELF_INFO", {
						...this.storeSelfInfo,
						...info,
					});
				};

				IMSDK.subscribe(IMSDK.IMEvents.OnSelfInfoUpdated, selfInfoUpdateHandler);

				// message
				const newMessagesHandler = ({
					messages
				}) => {
					if (this.storeIsSyncing) {
						return;
					}
					const messageList = JSON.parse(messages);
					messageList.forEach(this.handleNewMessage);
				};
				const c2cReadReceiptHandler = ({
					msgReceiptList
				}) => {
					const receiptList = JSON.parse(msgReceiptList);
					if (receiptList[0].userID !== this.storeCurrentConversation.userID) {
						return;
					}

					receiptList.forEach((item) => {
						item.msgIDList.forEach((msgID) => {
							this.updateOneMessage({
								message: {
									clientMsgID: msgID,
								},
								type: UpdateMessageTypes.KeyWords,
								keyWords: {
									key: "isRead",
									value: true,
								},
							});
						});
					});
				};
				const groupReadReceiptHandler = ({
					groupMsgReceiptList
				}) => {
					const receiptList = JSON.parse(groupMsgReceiptList);
					console.log(receiptList);
					if (receiptList[0].groupID !== this.storeCurrentConversation.groupID) {
						return;
					}

					receiptList.forEach((item) => {
						item.msgIDList.forEach((msgID) => {
							const inlineMessage = this.storeHistoryMessageList.find(
								(message) => message.clientMsgID === msgID
							);
							if (inlineMessage) {
								inlineMessage.attachedInfoElem.groupHasReadInfo.hasReadUserIDList = [
									...(inlineMessage.attachedInfoElem.groupHasReadInfo
										.hasReadUserIDList ?? []),
									item.userID,
								];
								// Members who join later in the workgroup will also send read receipts. Need filter.
								if (inlineMessage.attachedInfoElem.groupHasReadInfo.groupMemberCount -
									inlineMessage.attachedInfoElem.groupHasReadInfo.hasReadCount > 1) {
									inlineMessage.attachedInfoElem.groupHasReadInfo.hasReadCount += 1;
								}

								console.log({
									...inlineMessage,
								});
								this.updateOneMessage({
									message: {
										...inlineMessage,
									},
								});
							}
						});
					});
				};
				const newRecvMessageRevokedHandler = ({
					msgRevoked
				}) => {
					const revokedMessage = JSON.parse(msgRevoked);
					if (!this.storeCurrentConversation.conversationID) {
						return;
					}

					this.updateOneMessage({
						message: {
							clientMsgID: revokedMessage.clientMsgID,
						},
						type: UpdateMessageTypes.KeyWords,
						keyWords: [{
								key: "contentType",
								value: MessageType.ADVANCEREVOKEMESSAGE,
							},
							{
								key: "content",
								value: JSON.stringify(revokedMessage),
							},
						],
					});
				};

				IMSDK.subscribe(IMSDK.IMEvents.OnRecvNewMessages, newMessagesHandler);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnRecvC2CReadReceipt,
					c2cReadReceiptHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnRecvGroupReadReceipt,
					groupReadReceiptHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnNewRecvMessageRevoked,
					newRecvMessageRevokedHandler
				);

				// friend
				const friendInfoChangeHandler = ({
					friendInfo
				}) => {
					const updatedInfo = JSON.parse(friendInfo);
					console.log(updatedInfo);
					this.updateFriendInfo({
						friendInfo: updatedInfo,
					});
				};
				const friendAddedHandler = ({
					friendInfo
				}) => {
					const updatedInfo = JSON.parse(friendInfo);
					this.pushNewFriend(updatedInfo);
				};
				const friendDeletedHander = ({
					friendInfo
				}) => {
					const updatedInfo = JSON.parse(friendInfo);
					this.updateFriendInfo({
						friendInfo: updatedInfo,
						isRemove: true,
					});
				};

				IMSDK.subscribe(
					IMSDK.IMEvents.OnFriendInfoChanged,
					friendInfoChangeHandler
				);
				IMSDK.subscribe(IMSDK.IMEvents.OnFriendAdded, friendAddedHandler);
				IMSDK.subscribe(IMSDK.IMEvents.OnFriendDeleted, friendDeletedHander);

				// blacklist
				const blackAddedHandler = ({
					blackInfo
				}) => {
					const updatedInfo = JSON.parse(blackInfo);
					this.pushNewBlack(updatedInfo);
				};
				const blackDeletedHandler = ({
					blackInfo
				}) => {
					const updatedInfo = JSON.parse(blackInfo);
					this.updateBlackInfo({
						blackInfo: updatedInfo,
						isRemove: true,
					});
				};

				IMSDK.subscribe(IMSDK.IMEvents.OnBlackAdded, blackAddedHandler);
				IMSDK.subscribe(IMSDK.IMEvents.OnBlackDeleted, blackDeletedHandler);

				// group
				const joinedGroupAddedHandler = ({
					groupInfo
				}) => {
					const updatedInfo = JSON.parse(groupInfo);
					this.pushNewGroup(updatedInfo);
				};
				const joinedGroupDeletedHandler = ({
					groupInfo
				}) => {
					const updatedInfo = JSON.parse(groupInfo);
					this.updateGroupInfo({
						groupInfo: updatedInfo,
						isRemove: true,
					});
				};
				const groupInfoChangedHandler = ({
					groupInfo
				}) => {
					const updatedInfo = JSON.parse(groupInfo);
					this.updateGroupInfo({
						groupInfo: updatedInfo,
					});
				};
				const groupMemberInfoChangedHandler = ({
					groupMemberInfo
				}) => {
					const updatedInfo = JSON.parse(groupMemberInfo);
					this.updateCurrentMemberInGroup(updatedInfo);
				};

				IMSDK.subscribe(
					IMSDK.IMEvents.OnJoinedGroupAdded,
					joinedGroupAddedHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnJoinedGroupDeleted,
					joinedGroupDeletedHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnGroupInfoChanged,
					groupInfoChangedHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnGroupMemberInfoChanged,
					groupMemberInfoChangedHandler
				);

				// application
				const friendApplicationNumHandler = ({
					friendApplication
				}) => {
					const updatedApplication = JSON.parse(friendApplication);
					const isRecv = updatedApplication.toUserID === this.storeCurrentUserID;
					if (isRecv) {
						this.pushNewRecvFriendApplition(updatedApplication);
					} else {
						this.pushNewSentFriendApplition(updatedApplication);
					}
				};
				const friendApplicationAccessHandler = ({
					friendApplication
				}) => {
					const updatedApplication = JSON.parse(friendApplication);
					const isRecv = updatedApplication.toUserID === this.storeCurrentUserID;
					if (isRecv) {
						this.updateRecvFriendApplition({
							application: updatedApplication,
						});
					} else {
						this.updateSentFriendApplition({
							application: updatedApplication,
						});
					}
				};
				const groupApplicationNumHandler = ({
					groupApplication
				}) => {
					const updatedApplication = JSON.parse(groupApplication);
					const isRecv = updatedApplication.userID !== this.storeCurrentUserID;
					if (isRecv) {
						this.pushNewRecvGroupApplition(updatedApplication);
					} else {
						this.pushNewSentGroupApplition(updatedApplication);
					}
				};
				const groupApplicationAccessHandler = ({
					groupApplication
				}) => {
					const updatedApplication = JSON.parse(groupApplication);
					const isRecv = updatedApplication.userID !== this.storeCurrentUserID;
					if (isRecv) {
						this.updateRecvGroupApplition({
							application: updatedApplication,
						});
					} else {
						this.updateSentGroupApplition({
							application: updatedApplication,
						});
					}
				};

				IMSDK.subscribe(
					IMSDK.IMEvents.OnFriendApplicationAdded,
					friendApplicationNumHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnFriendApplicationAccepted,
					friendApplicationAccessHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnFriendApplicationRejected,
					friendApplicationAccessHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnGroupApplicationAdded,
					groupApplicationNumHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnGroupApplicationAccepted,
					groupApplicationAccessHandler
				);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnGroupApplicationRejected,
					groupApplicationAccessHandler
				);

				// conversation
				const totalUnreadCountChangedHandler = ({
					totalUnreadCount
				}) => {
					if (this.storeIsSyncing) {
						return;
					}
					this.$store.commit("conversation/SET_UNREAD_COUNT", totalUnreadCount);
				};
				const newConversationHandler = ({
					conversationList
				}) => {
					if (this.storeIsSyncing) {
						return;
					}
					const news = JSON.parse(conversationList);
					const result = [...news, ...this.storeConversationList];
					this.$store.commit(
						"conversation/SET_CONVERSATION_LIST",
						conversationSort(result)
					);
				};
				const conversationChangedHandler = ({
					conversationList
				}) => {
					if (this.storeIsSyncing) {
						return;
					}
					let filterArr = [];
					const changes = JSON.parse(conversationList);
					console.log(changes);
					const chids = changes.map((ch) => ch.conversationID);
					filterArr = this.storeConversationList.filter(
						(tc) => !chids.includes(tc.conversationID)
					);
					const idx = changes.findIndex(
						(c) =>
						c.conversationID === this.storeCurrentConversation.conversationID
					);
					if (idx !== -1)
						this.$store.commit(
							"conversation/SET_CURRENT_CONVERSATION",
							changes[idx]
						);
					const result = [...changes, ...filterArr];
					this.$store.commit(
						"conversation/SET_CONVERSATION_LIST",
						conversationSort(result)
					);
				};

				IMSDK.subscribe(
					IMSDK.IMEvents.OnTotalUnreadMessageCountChanged,
					totalUnreadCountChangedHandler
				);
				IMSDK.subscribe(IMSDK.IMEvents.OnNewConversation, newConversationHandler);
				IMSDK.subscribe(
					IMSDK.IMEvents.OnConversationChanged,
					conversationChangedHandler
				);
				
				
				const insertInCurrentConversation = (newServerMsg) => {
					return (
						newServerMsg.sendID === this.$store.getters.storeCurrentConversation.userID ||
						newServerMsg.recvID === this.$store.getters.storeCurrentConversation.userID
					);
				};
				
				const onNativeCallEndHandler = ({invitation,duration,status}) => {
					uni.$emit(PageEvents.NativeCallEnd)
					if(!status || invitation.groupID){
						return;
					}
					const customData = {
						customType: CustomType.Call,
						data: {
							type: invitation.mediaType === 'video' ? CustomType.VideoCall : CustomType.VoiceCall,
							duration: secFormat(duration),
							status,
						},
					};
					const message = IMSDK.IMApi.createCustomMessage(IMSDK.uuidv4(), customData, {}, "RTC")
					const sourceID = invitation.inviteeUserIDList[0]
					IMSDK.compatibleAPI(IMSDK
						.IMMethods.InsertSingleMessageToLocalStorage, IMSDK.uuidv4(), message, sourceID, invitation.inviterUserID)
						.then(({
							data
						}) => {
							if (insertInCurrentConversation(data)) {
								this.$store.dispatch('message/pushNewMessage', data);
								setTimeout(() =>
									uni.$emit(
										PageEvents.ScrollToBottom,
										true
									)
								);
							}
						}).catch(err => {
							console.log(err);
						})
				}
				
				IMSDK.subscribe("onNativeCallEnd",onNativeCallEndHandler)
			},

			setPageListener() {
				uni.$on(PageEvents.CheckForUpdate, this.checkVersion)
			},
			// backPlayRing(audioSrc) {
			// 	innerAudioContext.src = audioSrc;
			// 	innerAudioContext.loop = true;
			// },
			
			checkCalling() {
				getRtcInvitaion().then(invitationData => {
					console.log(invitationData);
					if (invitationData.invitation) {
						IMSDK.callingModule.launchLiveChat(invitationData)
					}
				})
			},

			tryLogin() {
				getDbDir()
					.then((path) => {
						const flag = IMSDK.IMApi.initSDK(IMSDK.uuidv4(), {
							platform: uni.$u.os() === "ios" ? 1 : 2, // 平台，参照IMPlatform类,
							api_addr: config.apiUrl, // SDK的API接口地址。如：http://xxx:10002
							ws_addr: config.wsUrl, // SDK的websocket地址。如： ws://xxx:10001
							data_dir: path, // 数据存储路径
							object_storage: config.objectStorage, // 图片服务器
							log_level: 6,
						});
						console.log(flag);
						if (!flag) {
							plus.navigator.closeSplashscreen();
							uni.$u.toast("初始化IMSDK失败！");
							return;
						}

						IMSDK.IMApi.setUserListener();
						IMSDK.IMApi.setFriendListener();
						IMSDK.IMApi.setGroupListener();
						IMSDK.IMApi.setAdvancedMsgListener();
						IMSDK.IMApi.setConversationListener();
						IMSDK.IMApi.setBatchMsgListener();
						IMSDK.callingModule?.initModule();

						const IMToken = uni.getStorageSync("IMToken");
						const IMUserID = uni.getStorageSync("IMUserID");
						console.log(IMToken, IMUserID);
						if (IMToken && IMUserID) {
							IMSDK.compatibleAPI(
									IMSDK.IMMethods.Login,
									IMSDK.uuidv4(),
									IMUserID,
									IMToken
								)
								.then((res) => {
									this.checkCalling();
									// this.$store.commit("user/SET_AUTH_DATA", data);
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
										url: "/pages/conversation/conversationList/index?isRedirect=true",
									});
								})
								.catch((err) => {
									console.log(err);
									uni.removeStorage({
										key: "IMToken",
									});
									uni.removeStorage({
										key: "BusinessToken",
									});
									plus.navigator.closeSplashscreen();
								});
						} else {
							plus.navigator.closeSplashscreen();
						}
					})
					.catch((err) => {
						console.log('get dir failed');
						console.log(err);
						plus.navigator.closeSplashscreen()
					});
			},

			launchCheck() {
				plus.globalEvent.addEventListener('newintent', (e) => {
					console.log(plus.runtime.arguments);
					let launchData = {}
					try {
						launchData = JSON.parse(plus.runtime.arguments)
					} catch (e) {}
					switch (launchData.type) {
						case "updateDownloadFinish":
							break;
						case "updateProgress":
							if (pausing) return;

							if (updateDownloadTask?.state === 5) {
								updateDownloadTask?.resume();
							} else {
								updateDownloadTask?.pause();
								this.updateNotification('暂停中');
								pausing = true
							}
							break;
						default:
							break;
					}
				});
			},
			checkVersion(initiative = false) {
				if (uni.$u.os() === 'ios') {
					return;
				}
				plus.runtime.getProperty(plus.runtime.appid, ({
					version
				}) => {
					checkUpdateFormPgyer(version)
						.then(async ({
							buildHaveNewVersion,
							needForceUpdate,
							downloadURL,
							buildUpdateDescription,
							buildVersion
						}) => {
							if (buildHaveNewVersion) {
								const hasDownloadedPath = await this.checkDownloadedPkg(buildVersion)
								uni.showModal({
									title: '检测到新版本',
									content: hasDownloadedPath ? '新版本已下载完毕，是否立即更新？' :
										buildUpdateDescription || '',
									showCancel: !needForceUpdate,
									confirmText: hasDownloadedPath ? '立即更新' : '立即升级',
									cancelText: '下次再说',
									success: (res) => {
										if (res.confirm) {
											if (hasDownloadedPath) {
												plus.runtime.install(hasDownloadedPath);
											} else {
												this.downloadApk(downloadURL, buildVersion)
											}
										} else {
											if (needForceUpdate) {
												plus.runtime.quit();
											}
										}
									}
								});
							}

							if (initiative && !buildHaveNewVersion) {
								uni.$u.toast('当前已是最新版本！')
							}
						}).catch(err => {
							console.log(err);
							if (initiative) {
								uni.$u.toast('获取版本信息失败！')
							}
						}).finally(() => initiative && uni.$emit(PageEvents.CheckForUpdateResp))
				})
			},
			async checkDownloadedPkg(buildVersion) {
				const versionMap = uni.getStorageSync('IMVersionMap') || {}
				const filePath = versionMap[buildVersion]
				const [err] = await uni.getSavedFileInfo({
					filePath
				});
				return err ? '' : filePath
			},
			downloadApk(downloadURL, buildVersion) {
				notificationIntance = new NotificationUtil()

				updateDownloadTask = plus.downloader.createDownload(downloadURL)

				updateDownloadTask.addEventListener("statechanged", (task, status) => {

					if (task.state === 3) {
						uni.$u.throttle(() => this.updateNotification('正在下载...'), 1000);
					}

					if (task.state === 5) {
						this.updateNotification('已暂停', true);
						pausing = false
					}

					if (task.state === 4) {
						if (status === 200) {
							this.updateNotification('正在下载...')
							setTimeout(() => this.downloadFinish(buildVersion), 200)
						}
					}
				})
				updateDownloadTask.start();
			},
			updateNotification(content, isPause = false) {
				const progress = parseInt(updateDownloadTask.downloadedSize / updateDownloadTask.totalSize * 100);
				const config = {
					progress,
					isPause,
					title: 'OpenIM',
					content: `${content}${progress}%`,
					intentList: [
						['type', 'updateProgress']
					]
				}
				notificationIntance.createProgress(config)
			},
			downloadFinish(buildVersion) {
				notificationIntance.clearNotification(1000)
				notificationIntance.compProgressNotification({
					title: 'OpenIM',
					content: '下载完成',
					notifyId: 1001
				})
				uni.showModal({
					title: '准备更新',
					content: '安装包已下载完毕，是否立即更新？',
					showCancel: false,
					confirmText: '立即更新',
					success: (res) => {
						const pkgPath = plus.io.convertLocalFileSystemURL(updateDownloadTask.filename)
						if (res.confirm) {
							plus.runtime.install(pkgPath);
						} else {
							const versionMap = uni.getStorageSync('IMVersionMap') || {}
							versionMap[buildVersion] = pkgPath
							uni.setStorage({
								key: 'IMVersionMap',
								data: versionMap
							})
						}
					}
				});
			},

			async newMessageNotify(newServerMsg) {
				if (this.storeIsSyncing) {
					return;
				}

				const disableNotify = uni.getStorageSync(
					`${this.storeCurrentUserID}_DisableNotify`
				);
				if (disableNotify || this.storeSelfInfo.globalRecvMsgOpt !== OptType.Nomal) {
					return;
				}

				let cveItem = [
					...this.storeConversationList,
					...cacheConversationList,
				].find((conversation) => {
					if (GroupSessionTypes.includes(newServerMsg.sessionType)) {
						return newServerMsg.groupID === conversation.groupID;
					}
					return (
						newServerMsg.sendID === conversation.userID
					);
				});

				if (!cveItem) {
					try {
						const {
							data
						} = await IMSDK.compatibleAPI(
							IMSDK.IMMethods.GetOneConversation,
							IMSDK.uuidv4(),
							newServerMsg.sessionType,
							newServerMsg.groupID || newServerMsg.sendID
						);
						cveItem = data;
						cacheConversationList = [...cacheConversationList, data];
					} catch (e) {
						return;
					}
				}

				if (cveItem.recvMsgOpt !== OptType.Nomal) {
					return;
				}

				// uni.createPushMessage({
				// 	content: `${newServerMsg.senderNickname}: ${parseMessageByType(newServerMsg)}`,
				// 	payload: {
				// 		sessionType: newServerMsg.sessionType,
				// 		sourceID: newServerMsg.groupID || newServerMsg.sendID,
				// 	}
				// })

				const platform = uni.getSystemInfoSync().platform;
				if (platform == "ios") {
					if (this.storeSelfInfo.allowVibration === 1) {
						plus.device.vibrate();
					}

					if (this.storeSelfInfo.allowBeep === 1) {
						innerAudioContext.play();
						// plus.device.beep();
					}
				} else if (platform == "android") {
					if (this.storeSelfInfo.allowVibration === 1) {
						plus.device.vibrate(500);
					}
					if (this.storeSelfInfo.allowBeep === 1) {
						let main = plus.android.runtimeMainActivity();
						let RingtoneManager = plus.android.importClass(
							"android.media.RingtoneManager"
						);
						let uri = RingtoneManager.getActualDefaultRingtoneUri(
							main,
							RingtoneManager.TYPE_NOTIFICATION
						);
						let MediaPlayer = plus.android.importClass(
							"android.media.MediaPlayer"
						);
						let player = MediaPlayer.create(main, uri);
						player.setLooping(false);
						player.prepare();
						player.start();
					}
				}
			},
			handleNewMessage(newServerMsg) {
				if (this.inCurrentConversation(newServerMsg)) {
					const isSingleMessage = newServerMsg.sessionType === SessionType.Single;

					if (isSingleMessage) {
						uni.$u.throttle(() => uni.$emit(PageEvents.OnlineStateCheck), 2000);
					}

					if (newServerMsg.contentType === MessageType.TYPINGMESSAGE) {
						if (isSingleMessage) {
							uni.$emit(PageEvents.TypingUpdate);
						}
					} else {
						if (newServerMsg.contentType === MessageType.ADVANCEREVOKEMESSAGE) {} else {
							newServerMsg.isAppend = true;
							this.pushNewMessage(newServerMsg);
							setTimeout(() =>
								uni.$emit(
									PageEvents.ScrollToBottom,
									true
								)
							);
						}
						uni.$u.debounce(this.markConversationAsRead, 2000);
					}
				} else {
					if (newServerMsg.contentType !== MessageType.TYPINGMESSAGE) {
						uni.$u.throttle(() => this.newMessageNotify(newServerMsg), 1000);
					}
				}
			},
			inCurrentConversation(newServerMsg) {
				switch (newServerMsg.sessionType) {
					case SessionType.Single:
						return (
							newServerMsg.sendID === this.storeCurrentConversation.userID ||
							(newServerMsg.sendID === this.storeCurrentUserID &&
								newServerMsg.recvID === this.storeCurrentConversation.userID)
						);
					case SessionType.Group:
					case SessionType.WorkingGroup:
						return newServerMsg.groupID === this.storeCurrentConversation.groupID;
					case SessionType.Notification:
						return newServerMsg.sendID === this.storeCurrentConversation.userID;
					default:
						return false;
				}
			},
			markConversationAsRead() {
				IMSDK.compatibleAPI(
					IMSDK.IMMethods.MarkMessageAsReadByConID,
					IMSDK.uuidv4(),
					this.storeCurrentConversation.conversationID,
					[]
				);
			},
		},
		watch: {
			storeCurrentUserID(newVal) {
				if (newVal) {
					cacheConversationList = []
				}
			},
			contactBadgeRely: {
				handler(newValue) {
					const {
						recvFriendApplications,
						recvGroupApplications,
						userKey
					} =
					newValue;
					if (!userKey) return;
					const accessedFriendApplications =
						uni.getStorageSync(`${userKey}_accessedFriendApplications`) || [];
					let unHandleFriendApplicationNum = recvFriendApplications.filter(
						(application) =>
						application.handleResult === 0 &&
						!accessedFriendApplications.includes(
							`${application.fromUserID}_${application.createTime}`
						)
					).length;
					const accessedGroupApplications =
						uni.getStorageSync(`${userKey}_accessedGroupApplications`) || [];
					let unHandleGroupApplicationNum = recvGroupApplications.filter(
						(application) =>
						application.handleResult === 0 &&
						!accessedGroupApplications.includes(
							`${application.userID}_${application.createTime}`
						)
					).length;
					const total =
						unHandleFriendApplicationNum + unHandleGroupApplicationNum;
					if (total) {
						uni.setTabBarBadge({
							index: 1,
							text: total < 99 ? total + "" : "99+",
						});
					} else {
						uni.removeTabBarBadge({
							index: 1,
						});
					}
					this.$store.commit(
						"contact/SET_UNHANDLE_FRIEND_APPLICATION_NUM",
						unHandleFriendApplicationNum
					);
					this.$store.commit(
						"contact/SET_UNHANDLE_GROUP_APPLICATION_NUM",
						unHandleGroupApplicationNum
					);
				},
				deep: true,
			},
		},
	};
</script>

<style lang="scss">
	/*每个页面公共css */
	@import "@/uni_modules/uview-ui/index.scss";
	@import "@/styles/login.scss";
	@import "@/styles/global.scss";

	uni-page-body {
		height: 100vh;
		overflow: hidden;
	}
</style>