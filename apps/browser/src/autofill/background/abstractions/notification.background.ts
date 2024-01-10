import { NotificationQueueMessageTypes } from "../../enums/notification-queue-message-type.enum";

interface NotificationQueueMessage {
  type: NotificationQueueMessageTypes;
  domain: string;
  tab: chrome.tabs.Tab;
  expires: Date;
  wasVaultLocked: boolean;
}

interface AddChangePasswordQueueMessage extends NotificationQueueMessage {
  type: "change";
  cipherId: string;
  newPassword: string;
}

interface AddLoginQueueMessage extends NotificationQueueMessage {
  type: "add";
  username: string;
  password: string;
  uri: string;
}

interface AddUnlockVaultQueueMessage extends NotificationQueueMessage {
  type: "unlock";
}

interface AddRequestFilelessImportQueueMessage extends NotificationQueueMessage {
  type: "fileless-import";
  importType?: string;
}

type NotificationQueueMessageItem =
  | AddLoginQueueMessage
  | AddChangePasswordQueueMessage
  | AddUnlockVaultQueueMessage
  | AddRequestFilelessImportQueueMessage;

type LockedVaultPendingNotificationsData = {
  commandToRetry: {
    message: {
      command: string;
      contextMenuOnClickData?: chrome.contextMenus.OnClickData;
    };
    sender: chrome.runtime.MessageSender;
  };
  target: string;
};

type AdjustNotificationBarMessageData = {
  height: number;
};

type ChangePasswordMessageData = {
  currentPassword: string;
  newPassword: string;
  url: string;
};

type AddLoginMessageData = {
  username: string;
  password: string;
  url: string;
};

type NotificationBackgroundExtensionMessage = {
  [key: string]: any;
  command: string;
  data?:
    | LockedVaultPendingNotificationsData
    | AdjustNotificationBarMessageData
    | ChangePasswordMessageData;
  login?: AddLoginMessageData;
  responseCommand?: string;
};

export {
  AddChangePasswordQueueMessage,
  AddLoginQueueMessage,
  AddUnlockVaultQueueMessage,
  AddRequestFilelessImportQueueMessage,
  NotificationQueueMessageItem,
  LockedVaultPendingNotificationsData,
  AddLoginMessageData,
  AdjustNotificationBarMessageData,
  ChangePasswordMessageData,
  NotificationBackgroundExtensionMessage,
};
