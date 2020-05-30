import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import * as AWS  from 'aws-sdk'
import { UpdateTodoRequest } from '../../requests/UpdateTodoRequest'
import { createLogger } from '../../utils/logger'

const logger = createLogger('update-todo')

const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

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
  const todoItems = getTodoPerTodoId(todoId)
  if (!todoItems){
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
        todoId: todoId
    },
    UpdateExpression: "set name = :n, dueDate = :d, done = :b",
    ExpressionAttributeValues:{
        ":n":updatedTodo.name,
        ":d":updatedTodo.dueDate,
        ":b":updatedTodo.done
    },
    ReturnValues:"UPDATED_NEW"
  }

  logger.info('Patching Todo Item: ', todoItems[0])
  // Patch
  const updResult = docClient.update(itemUpdate, function(err, data) {
    if (err) {
        logger.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        logger.info("Update succeeded:", JSON.stringify(data, null, 2));
    }
  })
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
  logger.info('Query Table for Todo: ', todoId)
  const result = await docClient.query({
    TableName: todosTable,
    KeyConditionExpression: 'todoId = :todoId',
    ExpressionAttributeValues: {
      ':todoId': todoId
    },
    ScanIndexForward: false
  }).promise()
  logger.info('Return result from table query.')
  return result.Items
} 
