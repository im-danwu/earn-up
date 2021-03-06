import { TaskList } from '../models/TaskList'
import { UpdateTaskListRequest } from '../requests/UpdateTaskListRequest'
import * as helpers from './helpers';
import createDynamoDBClient from './dynamoDBAccess'

export default class TaskListsAccess {
  constructor(
    private readonly docClient = createDynamoDBClient(),
    private readonly taskListsTable = process.env.TASK_LISTS_TABLE,
    private readonly index = process.env.TASK_LISTS_INDEX
  ) { }

  async getTaskList(userId: string, taskListId: TaskList['taskListId']): Promise<TaskList | undefined> {
    const result = await this.docClient
      .get({
        TableName: this.taskListsTable,
        Key: {
          userId,
          taskListId,
        }
      })
      .promise()

    return result.Item as TaskList
  }

  async getTaskLists(userId: string): Promise<TaskList[]> {
    const result = await this.docClient
      .query({
        TableName: this.taskListsTable,
        IndexName: this.index,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      .promise()

    const items = result.Items
    return items as TaskList[]
  }

  async createTaskList(taskList: TaskList): Promise<void> {
    await this.docClient
      .put({
        TableName: this.taskListsTable,
        Item: taskList
      })
      .promise()
  }

  async upsertTaskList(taskList: TaskList): Promise<TaskList> {
    const { taskListId, userId } = taskList;

    // cannot use ConditionExpression to do a conditional update because the composite PK is used in the
    // UpdateExpression and ConditionExpression...
    // doing a GET and then UPDATE allows a race condition then 🤷‍♂️
    const existing = await this.getTaskList(userId, taskListId)
    if (existing) {
      return existing;
    } else {
      await this.createTaskList(taskList)
      return taskList
    }
  }

  async updateTaskList(
    userId: TaskList['userId'],
    taskListId: TaskList['taskListId'],
    updatedTaskList: UpdateTaskListRequest
  ): Promise<void> {
    const { title, syncedAt } = updatedTaskList
    const ExpressionAttributeValues = {
      ':title': title,
      ':syncedAt': syncedAt,
    }

    await this.docClient
      .update({
        TableName: this.taskListsTable,
        Key: {
          userId,
          taskListId
        },
        UpdateExpression: helpers.getUpdateExpression(ExpressionAttributeValues),
        ExpressionAttributeValues,
      })
      .promise()
  }

  async deleteTaskList(userId: TaskList['userId'], taskListId: TaskList['taskListId']): Promise<void> {
    await this.docClient
      .delete({
        TableName: this.taskListsTable,
        Key: {
          userId,
          taskListId
        }
      })
      .promise()
  }
}
