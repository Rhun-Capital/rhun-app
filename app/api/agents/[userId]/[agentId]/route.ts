import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { getAgentConfig } from '@/utils/agent-tools';
import { uploadToS3, deleteFromS3, getKeyFromUrl } from '@/utils/s3';

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
    const item = await getAgentConfig(params.userId, params.agentId);
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string; agentId: string } }
) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as Blob | null;
    const agentData = JSON.parse(formData.get('data') as string);
    
    let imageUrl = agentData.imageUrl || '';

    if (image) {
      // Upload new image with timestamp to prevent caching
      const buffer = Buffer.from(await image.arrayBuffer());
      const key = `agents/${params.agentId}/profile.jpg`;
      imageUrl = await uploadToS3(buffer, key);
    }

    const finalAgentData = {
      ...agentData,
      imageUrl,
      updatedAt: new Date().toISOString(),
    };

    await dynamodb.update({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId,
      },
      UpdateExpression: 'set #n = :name, description = :description, imageUrl = :imageUrl, coreCapabilities = :coreCapabilities, interactionStyle = :interactionStyle, analysisApproach = :analysisApproach, riskCommunication = :riskCommunication, responseFormat = :responseFormat, limitationsDisclaimers = :limitationsDisclaimers, prohibitedBehaviors = :prohibitedBehaviors, knowledgeUpdates = :knowledgeUpdates, responsePriorityOrder = :responsePriorityOrder, styleGuide = :styleGuide, specialInstructions = :specialInstructions, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#n': 'name',
      },
      ExpressionAttributeValues: {
        ':name': finalAgentData.name,
        ':description': finalAgentData.description,
        ':imageUrl': finalAgentData.imageUrl,
        ':coreCapabilities': finalAgentData.coreCapabilities,
        ':interactionStyle': finalAgentData.interactionStyle,
        ':analysisApproach': finalAgentData.analysisApproach,
        ':riskCommunication': finalAgentData.riskCommunication,
        ':responseFormat': finalAgentData.responseFormat,
        ':limitationsDisclaimers': finalAgentData.limitationsDisclaimers,
        ':prohibitedBehaviors': finalAgentData.prohibitedBehaviors,
        ':knowledgeUpdates': finalAgentData.knowledgeUpdates,
        ':responsePriorityOrder': finalAgentData.responsePriorityOrder,
        ':styleGuide': finalAgentData.styleGuide,
        ':specialInstructions': finalAgentData.specialInstructions,
        ':updatedAt': finalAgentData.updatedAt,
      },
      ReturnValues: 'ALL_NEW',
    }).promise();

    return NextResponse.json({
      message: 'Agent updated successfully',
      imageUrl: finalAgentData.imageUrl
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
  { params }: { params: { userId: string; agentId: string } }
) {
  try {
    // First, get the agent to check for image
    const currentAgent = await dynamodb.get({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId
      }
    }).promise();

    if (!currentAgent.Item) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete the agent from DynamoDB
    await dynamodb.delete({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId
      },
      ConditionExpression: 'attribute_exists(id)'
    }).promise();

    return NextResponse.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);

    if ((error as any).code === 'ConditionalCheckFailedException') {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}