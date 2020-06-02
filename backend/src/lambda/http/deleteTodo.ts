import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { createLogger } from '../../utils/logger'
import * as AWS  from 'aws-sdk'
import { TodoItem } from '../../models/TodoItem'
import * as AWSXray from 'aws-xray-sdk'
const XAWS = AWSXray.captureAWS(AWS)

const logger = createLogger('delete-todo')

const docClient = new XAWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE
const todosTodoIdIdx = process.env.TODOS_ID_INDEX
// TODO: Delete Images of Todo
// const imagesTable = process.env.IMAGES_TABLE
// const bucketName = process.env.IMAGES_S3_BUCKET

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId
  if (!todoId){
    logger.info('Item Id not provided.')
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        error: 'Item Id not provided.'
      })
    }
  }
  const todoItem = await getTodoItemById(todoId)
  
  logger.info('Deleting Todo Item: ', todoItem)
  
  const deleted = await deleteTodoItem(todoItem)
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    // Deleted item info
    body: JSON.stringify({item: deleted})
  }
}
async function getTodoItemById(todoId: any): Promise<TodoItem> {
  logger.info("Starting to fetch item with TodoID: "+todoId);
  const result = await docClient.query({
    TableName: todosTable,
    IndexName: todosTodoIdIdx,
    KeyConditionExpression: '#k = :id ',
    ExpressionAttributeNames: {'#k' : 'todoId'},
    ExpressionAttributeValues:{':id' : todoId}
  }).promise()
  logger.info("Completed getTodoItemById");
  logger.info("Found " + result.Count + " element (it must be unique)");
  if (result.Count == 0)
    throw new Error('Element not found')
  if (result.Count > 1)
    throw new Error('todoId is not Unique')
  const item = result.Items[0]
  logger.info("This is the item: ",item);
  return item as TodoItem
}
async function deleteTodoItem(delTodo: TodoItem): Promise<boolean> {
  logger.info("Deleting Item "+delTodo.todoId);
  // TODO: Delete also S3 items
  const delResult = await docClient.delete({
    TableName: todosTable,
    Key:
    {
      todoId: delTodo.todoId,
      userId: delTodo.userId
    }
  }).promise()
  logger.info("Completed deleteTodoItem");
  if (delResult.$response.error)
  {
    logger.error(delResult.$response.error)
    return false
  }
  return true
}