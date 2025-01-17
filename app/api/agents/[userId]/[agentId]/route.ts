
import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function GET(
  request: Request,
  { params }: { params: { userId: string, agentId: string } }
) {
  try {
    const result = await dynamodb.get({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId
      }
    }).promise();

    if (!result.Item) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.Item);

  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string, agentId: string } }
) {
  try {
    const body = await request.json();
    
    const result = await dynamodb.update({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId
      },
      UpdateExpression: `SET 
        #name = :name,
        description = :description,
        coreCapabilities = :cc,
        interactionStyle = :is,
        analysisApproach = :aa,
        riskCommunication = :rc,
        responseFormat = :rf,
        limitationsDisclaimers = :ld,
        prohibitedBehaviors = :pb,
        knowledgeUpdates = :ku,
        responsePriorityOrder = :rpo,
        styleGuide = :sg,
        updatedAt = :updatedAt`,
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': body.name,
        ':description': body.description,
        ':cc': body.coreCapabilities,
        ':is': body.interactionStyle,
        ':aa': body.analysisApproach,
        ':rc': body.riskCommunication,
        ':rf': body.responseFormat,
        ':ld': body.limitationsDisclaimers,
        ':pb': body.prohibitedBehaviors,
        ':ku': body.knowledgeUpdates,
        ':rpo': body.responsePriorityOrder,
        ':sg': body.styleGuide,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();

    return NextResponse.json({
      message: 'Agent updated successfully',
      agent: result.Attributes
    });

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string, agentId: string } }
) {
  try {
    await dynamodb.delete({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId
      }
    }).promise();

    return NextResponse.json({
      message: 'Agent deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}