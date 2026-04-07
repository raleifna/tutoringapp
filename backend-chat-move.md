# backend chat move

给后端同学的。

## 这次先做什么

- 先搬 tutor / learner 1v1 chat
- 不做 admin chat
- 不先搬 notification center
- notification 相关先别动，除非后面要接 badge

## 源项目后端相关文件

- `backend/prisma/schema.prisma`
- `backend/src/app.js`
- `backend/src/controllers/messageController.js`
- `backend/src/routes/messages.js`
- `backend/src/services/socketService.js`
- `backend/src/services/notificationService.js`
- `backend/server.js`
- `backend/package.json`

## 目标项目大概要改的文件

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `backend/src/app.js`
- `backend/src/controllers/messageController.js`
- `backend/src/routes/messages.js`
- `backend/src/services/socketService.js`
- `backend/server.js`
- `backend/package.json`

## 后端搬运顺序

### 1. schema

从源项目搬这些：

- `MessageStatus`
- `Conversation`
- `ConversationParticipant`
- `Message`

一起把：

- relation
- unique
- index

都补上。

然后生成 migration。

一句话：

- 先把 chat 表和关系补齐

建议 commit：

- `feat: add chat schema`

### 2. 路由骨架

新建：

- `backend/src/controllers/messageController.js`
- `backend/src/routes/messages.js`

然后在：

- `backend/src/app.js`

注册：

- `/api/v1/messages`

先挂上去就行。

一句话：

- 先把 messages 模块接进 app

建议 commit：

- `feat: add message routes`

### 3. 会话接口

先做：

- `GET /messages/conversations`
- `POST /messages/conversations`

要求：

- 能看到当前用户的会话
- 能按 `userId` 创建或获取 1v1 conversation
- 不能给自己发
- 目标用户不存在要拦
- 返回参与者基本信息
- 返回最后一条消息预览

一句话：

- 先把 conversation 这一层打通

建议 commit：

- `feat: add conversation api`

### 4. 消息接口

再做：

- `GET /messages/conversations/:conversationId`
- `POST /messages/conversations/:conversationId`

要求：

- 只有参与者能看
- 支持 `page` / `limit`
- 先做纯文本消息
- 发送后更新 conversation `updatedAt`

一句话：

- 再把 message 列表和发送打通

建议 commit：

- `feat: add message api`

### 5. 已读未读

做：

- `PATCH /messages/conversations/:conversationId/read`
- `GET /messages/unread-count`

然后会话列表顺手返回：

- `unreadCount`

一句话：

- 把 unread 一起补上

建议 commit：

- `feat: add unread api`

### 6. realtime

后面再接：

- `socketService`
- server 初始化 socket
- 发消息时推 `new_message`

如果还有时间再补：

- `join_conversation`
- `leave_conversation`
- `typing`

一句话：

- 最后再补实时

建议 commit：

- `feat: add chat socket`

### 7. 其他

最后再看要不要补：

- attachment
- 更严的权限
- 边界处理

建议 commit：

- `feat: polish chat backend`

## 先别做的

- admin chat
- notifications page 对齐
- 一上来就搬全部 socket 细节
- 一上来就搬 attachment

## 前端现在等什么

前端第一阶段至少需要这些后端接口能用：

- `GET /messages/conversations`
- `POST /messages/conversations`
- `GET /messages/conversations/:conversationId`
- `POST /messages/conversations/:conversationId`

如果要做未读 badge，还要：

- `PATCH /messages/conversations/:conversationId/read`
- `GET /messages/unread-count`
