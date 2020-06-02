import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import * as AWS  from 'aws-sdk'
import { UpdateTodoRequest } from '../../requests/UpdateTodoRequest'
import { createLogger } from '../../utils/logger'
import { TodoItem } from '../../models/TodoItem'
import { getUserId } from '../utils'

const logger = createLogger('update-todo')

const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE
// const todosNameIdx = process.env.TODOS_IDX_NAME
const todosTodoIdIdx = process.env.TODOS_ID_INDEX
//const todosUserIdIdx = process.env.USER_ID_INDEX

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId
  const updatedTodo: UpdateTodoRequest = JSON.parse(event.body)

  // DONE: Update a TODO item with the provided id using values in the "updatedTodo" object
  if (!todoId){
    logger.info('Item Id not provided.')
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Item Id not provided.'
      })
    }
  }
  logger.info('Patching Todo Item: ')
  // Patch
  const updItem = await updateExistingTodo(todoId,updatedTodo, event)

  logger.info("Update of Todo Item succeeded: ", updItem)
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({item: updItem})
  }
}

async function updateExistingTodo(todoId: string, updatedTodo: UpdateTodoRequest, event: APIGatewayProxyEvent): Promise<TodoItem> {
  const userId = getUserId(event)
  const currentItem = await getTodoItemById(todoId)
  logger.info("Update of Todo Item - "+todoId+" - for User - "+userId+" -!")
  const itemUpdate = {
    TableName: todosTable,
    Key:{
        todoId: todoId,
        createdAt: currentItem.createdAt
    },
    UpdateExpression: "set name = :n, dueDate = :d, done = :b",
    ExpressionAttributeValues:{
        ":n":updatedTodo.name,
        ":d":updatedTodo.dueDate,
        ":b":updatedTodo.done
    },
    ReturnValues:"UPDATED_NEW"
  }
  
  const updResult  = await docClient
  .update(itemUpdate, function(err, data) {
    if (err) {
        logger.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        logger.info("Update succeeded:", JSON.stringify(data, null, 2));
    }
  }).promise()

  return updResult.$response.data as TodoItem
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