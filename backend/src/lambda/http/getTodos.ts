import 'source-map-support/register'
import { createLogger } from '../../utils/logger'
import * as AWS  from 'aws-sdk'
import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { getUserId } from '../utils'
import { TodoItem } from '../../models/TodoItem'

const logger = createLogger('get-todos')

const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE
// const todosNameIdx = process.env.TODOS_IDX_NAME
// const todosTodoIdIdx = process.env.TODOS_ID_INDEX
const todosUserIdIdx = process.env.USER_ID_INDEX


export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // DONE: Get all TODO items for a current user
  logger.info('Processing event: ', event)
  const userId = getUserId(event)
  logger.info("Get ToDos for user : " + userId + " !", event)
  const todos = await getTodosPerUser(userId)
  logger.info('Return Todos: ', todos)

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      items: todos
    })
  }
}
async function getTodosPerUser(userId: string) {
  logger.info("Query Table for User: " + userId + " !")
  const result = await docClient.query({
    TableName: todosTable,
    IndexName: todosUserIdIdx,
    KeyConditionExpression: '#k = :uId ',
    ExpressionAttributeNames: {'#k' : 'userId'},
    ExpressionAttributeValues:{':uId' : userId}
  }).promise()
  logger.info("Return result from table query.")
  const items = result.Items
  logger.info("Found " + result.Count + " elements", items);

  return items as TodoItem[]
} 