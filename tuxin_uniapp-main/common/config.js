module.exports = {
	// https+域名形式   nginx配置可参考(https://doc.rentsoft.cn/#/v2/server_deploy/easy_deploy_new?id=%e4%ba%94%e3%80%81nginx%e9%85%8d%e7%bd%ae%e5%8f%82%e8%80%83)
 //    registerUrl: 'https://web.rentsoft.cn/chat',
	// apiUrl: 'https://web.rentsoft.cn/api',
	// configUrl: 'https://web.rentsoft.cn/complete_admin',
	// wsUrl: 'wss://web.rentsoft.cn/msg_gateway',
	// http+IP+端口形式 仅需替换IP即可  不必更换端口
	registerUrl: 'http://206.238.221.158:10008',
	configUrl: 'http://206.238.221.158:10009',
	apiUrl: 'http://206.238.221.158:10002',
	wsUrl: 'ws://206.238.221.158:10001',
	
	// 高德地图web api key  用于根据经纬度生成快照  当前key已绑定安卓包名  需要自行申请替换
	AmapWebKey: '',
	// 图片、视频等资源文件存储方式  支持minio cos oss  推荐minio、cos
	objectStorage: 'minio'
}
