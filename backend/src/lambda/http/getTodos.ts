import 'source-map-support/register'
import { createLogger } from '../../utils/logger'
import * as AWS  from 'aws-sdk'
import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { getUserId } from '../utils'

const logger = createLogger('get-todos')

const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE
const todosTableIdx = process.env.TODOS_INDEX_NAME


export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // DONE: Get all TODO items for a current user
  logger.info('Processing event: ', event.body.toString)
  const userId = getUserId(event)
  logger.info('Get ToDos for user : ', userId)
  const todos = await getTodosPerUser(userId)
  logger.info('Return Todos: ', todos)

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      items: todos
    })
  }
}
async function getTodosPerUser(userId: string) {
  logger.info('Query Table for User: ', userId)
  const result = await docClient.query({
    TableName: todosTable,
    IndexName: todosTableIdx,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
  }).promise()
  logger.info('Return result from table query.')
  return result.Items
} 