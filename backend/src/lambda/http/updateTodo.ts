import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import * as AWS  from 'aws-sdk'
import { UpdateTodoRequest } from '../../requests/UpdateTodoRequest'
import { createLogger } from '../../utils/logger'
import { TodoItem } from '../../models/TodoItem'

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
  const todoItem = await getTodoPerTodoId(todoId)
  if (!todoItem){
    logger.info('Item not found.')
    return{
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: "Item not found."
    }
  }

  const itemUpdate = {
    TableName: todosTable,
    Key:{
        todoId: todoItem.todoId,
        createdAt: todoItem.createdAt
    },
    UpdateExpression: "set name = :n, dueDate = :d, done = :b",
    ExpressionAttributeValues:{
        ":n":updatedTodo.name,
        ":d":updatedTodo.dueDate,
        ":b":updatedTodo.done
    },
    ReturnValues:"ALL_NEW"
  }

  logger.info('Patching Todo Item: ', todoItem)
  // Patch
  const updResult = docClient.update(itemUpdate, function(err, data) {
    if (err) {
        logger.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        logger.info("Update succeeded:", JSON.stringify(data, null, 2));
    }
  }).promise()
  logger.info("Update of Todo Item succeeded: ", updResult)
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: "Item updated."
  }
}
async function getTodoPerTodoId(todoId: string) {
  logger.info("Query Table for TodoId: " + todoId + " !")
  const result = await docClient.query({
    TableName: todosTable,
    IndexName: todosTodoIdIdx,
    KeyConditionExpression: '#k = :tId ',
    ExpressionAttributeNames: {'#k' : 'todoId'},
    ExpressionAttributeValues:{':tId' : todoId}
  }).promise()
  logger.info("Return result from table query.")
  const items = result.Items
  logger.info("Found " + result.Count + " elements", items);

  if (result.Count == 0)
    throw new Error('Element not found')
  if (result.Count > 1)
    throw new Error('todoId is not Unique')
  const item = items[0]
  
  return item as TodoItem
} 
