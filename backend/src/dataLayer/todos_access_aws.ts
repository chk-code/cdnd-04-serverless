import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { createLogger } from '../utils/logger'

const logger = createLogger('DATA-LAYER')

const XAWS = AWSXRay.captureAWS(AWS) 
const s3 = new XAWS.S3({
  signatureVersion: 'v4'
})

import { TodoItem } from '../models/TodoItem'
import { puts } from 'util'

export class Todos_Data_Access{
    /**
     * Standard Constructor for initializing the environment variables
     */
    constructor( 
        private readonly docClient = new XAWS.DynamoDB.DocumentClient(),
        private readonly todoTable = process.env.TODOS_TABLE,
        private readonly attImgsTable = process.env.IMAGES_TABLE,
        private readonly todoIndex = process.env.TODOS_ID_INDEX,
        private readonly nameIndex = process.env.TODOS_IDX_NAME,
        private readonly userIdIdx = process.env.USERID_IDX,
        private readonly bucketName = process.env.IMAGES_S3_BUCKET,
        private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION){
        }
    
    // GET Functions
    async getTodoByTodoId(todoId: string): Promise<TodoItem> {
        logger.info("### Starting getTodoByTodoId ###")
        const getRes = await this.docClient.query({
            TableName: this.todoTable,
            IndexName: this.todoIndex,
            KeyConditionExpression: '#TID = :tid ',
            ExpressionAttributeNames: {'#TID' : 'todoId'},
            ExpressionAttributeValues:{':tid' : todoId}
        }).promise()

        if (getRes.Count == 0){
          logger.error("Found " + getRes.Count + " elements!")
          throw new Error('Element not found') 
        }     
        if (getRes.Count > 1){
           logger.error("Found " + getRes.Count + " elements!")
           throw new Error('todoId is not Unique')
        }
        const item = getRes.Items[0]
        logger.info("Found " + getRes.Count + " element!",item)  
                  
        logger.info("### End of getTodoByTodoId ###")
        return item as TodoItem
    }
    async getTodosByUserId(userId: string): Promise<TodoItem[]> {
        logger.info("### Starting getTodosByUserId ###")
        const getRes = await this.docClient.query({
            TableName: this.todoTable,
            IndexName: this.userIdIdx,
            KeyConditionExpression: '#ID = :uId ',
            ExpressionAttributeNames: {'#ID' : 'userId'},
            ExpressionAttributeValues:{':uId' : userId}
        }).promise()
        if (getRes.Count == 0){
            logger.error("Found " + getRes.Count + " elements!")
            throw new Error('Element not found') 
        }  
        const items = getRes.Items
        logger.info("Found " + getRes.Count + " element(s)!",items) 
        
        logger.info("### End of getTodosByUserId ###")
        return items as TodoItem[]
    }
    async getUploadUrl(todoId: string, event: any): Promise<string> {
        logger.info("### Starting getUploadUrl ###")
        const signedURL = await s3.getSignedUrl('putObject', {
            Bucket: this.bucketName,
            Key: todoId,
            Expires: parseInt(this.urlExpiration)
        })
        await this.createImage(todoId,event)
        logger.info("### End of generateUploadUrl ###")
        return signedURL
    }
    // CREATE Functions
    async createTodo(todoItem: TodoItem): Promise<TodoItem> {
        logger.info("### Starting createTodo ###")
        const putResult = await this.docClient.put({
            TableName: this.todoTable,
            Item: todoItem
          }).promise()
        logger.info("### End of createTodo ###", putResult)
        return todoItem
    }
    async createImage(todoId: string, event: any) {
        const timestamp = new Date().toISOString()
        const newImage = JSON.parse(event.body)
        const imageId = todoId
        const newImgItem = {
          todoId,
          timestamp,
          imageId,
          ...newImage,
          imageUrl: `https://${this.bucketName}.s3.amazonaws.com/${imageId}`
        }
        logger.info('Storing new Image item in Image DB: ', newImgItem)
        await this.docClient.put({
            TableName: this.attImgsTable,
            Item: newImgItem
          }).promise()
    }
    // UPDATE Functions
    async updateTodo(todoId: string, userId: string, updateTodo: any): Promise<TodoItem> {
        logger.info("### Starting updateTodo ###")
        const resUpd = await this.docClient.update({
            TableName: this.todoTable,
            KeyConditionExpression: '#uID = :usID, #tID = :toID',
            UpdateExpression: 'set #n = :n, #dD = :dD, #d = :d',
            ExpressionAttributeNames: {
                '#n' : 'name',
                '#dD' : 'dueDate',
                '#d' : 'done',
                '#uID' : 'userId',
                '#tID' : 'todoId'
              },
            ExpressionAttributeValues:{
              ':n' : updateTodo.name,
              ':dD' : updateTodo.dueDate,
              ':d' : updateTodo.done,
              ':usID' : userId,
              ':toID' : todoId
              },
            ReturnValues: "UPDATED_NEW"
          }).promise()  
        logger.info("### End of updateTodo ###")
        return resUpd.$response.data as TodoItem  
    }
    async updateTodoURL(todoId: string, userId: string, signedURL: string): Promise<TodoItem> {
        logger.info("### Starting updateTodoURL ###")
        const resUpd = await this.docClient.update({
            TableName: this.todoTable,
            KeyConditionExpression: '#uID = :usID, #tID = :toID',
            UpdateExpression: 'set attachmentUrl = :attUrl',
            ExpressionAttributeNames: {
                '#uID' : 'userId',
                '#tID' : 'todoId'
              },
            ExpressionAttributeValues:{
              ':attUrl' : signedURL,
              ':usID' : userId,
              ':toID' : todoId
              },
            ReturnValues: "UPDATED_NEW"
          }).promise()  
          logger.info("### End of updateTodoURL ###")
        return resUpd.$response.data as TodoItem  
    }
    // DELETE Functions
    async deleteTodo(todoId: string, userId: string): Promise<boolean> {
        logger.info("### Starting deleteTodo ###")
        //if(await this.getImageS3(todoId))
        //    await this.deleteImageS3(todoId)
        const delRes = await this.docClient.delete({
        TableName: this.todoTable,
        Key:
        {
            todoId: todoId,
            userId: userId
        }
        }).promise()
        if (delRes.$response.error)
        {
            logger.error(delRes.$response.error)
            return false
        }
        logger.info("### End of deleteTodo ###")
        return true
    }
    // GENERATE Functions
    // Nothing yet
}