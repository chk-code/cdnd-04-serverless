import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { createLogger } from '../../utils/logger'
import * as AWS  from 'aws-sdk'

const logger = createLogger('delete-todo')

const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

// TODO: Delte Images of Todo
// const imagesTable = process.env.IMAGES_TABLE
// const bucketName = process.env.IMAGES_S3_BUCKET

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId
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
  logger.info('Deleting Todo Item: ', todoItems[0])
  
  var fileItem = {
    Key: {
      todoId: todoId
    },
    TableName: todosTable,
  }
  docClient.delete(fileItem, function(err, data) {
    if (err) {
      logger.error('Error while deleting',err, err.stack);
      return{
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: "Error while deleting."
      }
    } else {
      logger.info('Todo Item deleted: ', data)
    }
  })
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: "Item deleted."
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